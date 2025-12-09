import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCallback, useEffect, useState } from 'react';

export interface EvolutionChat {
  id: string;
  instance_name: string;
  remote_jid: string;
  push_name: string | null;
  profile_pic_url: string | null;
  unread_count: number;
  last_message: string | null;
  last_message_at: string | null;
  is_group: boolean;
  created_at: string;
  updated_at: string;
}

export interface EvolutionMessage {
  id: string;
  chat_id: string | null;
  instance_name: string;
  remote_jid: string;
  message_id: string;
  from_me: boolean;
  body: string | null;
  message_type: string;
  media_url: string | null;
  timestamp: string;
  status: string | null;
  created_at: string;
}

// Callback para notificar desconexão
type DisconnectCallback = () => void;

export function useEvolution(instanceName: string | null, onDisconnect?: DisconnectCallback) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Helper para detectar erro de desconexão
  const isDisconnectionError = (error: unknown): boolean => {
    const errorStr = error instanceof Error ? error.message : String(error);
    return (
      errorStr.toLowerCase().includes('connection closed') ||
      errorStr.toLowerCase().includes('not connected') ||
      errorStr.toLowerCase().includes('desconectado')
    );
  };

  // Handler para erros de desconexão
  const handleDisconnectionError = (error: unknown) => {
    if (isDisconnectionError(error)) {
      toast({
        title: 'WhatsApp desconectado',
        description: 'A sessão foi encerrada. Reconecte escaneando o QR code.',
        variant: 'destructive',
      });
      // Notificar a página sobre a desconexão
      onDisconnect?.();
      return true;
    }
    return false;
  };

  // Query para buscar chats do banco local
  const { 
    data: chats = [], 
    isLoading: loadingChats,
    refetch: refetchChats
  } = useQuery({
    queryKey: ['evolution-chats', instanceName],
    queryFn: async () => {
      if (!instanceName) return [];
      
      const { data, error } = await supabase
        .from('evolution_chats')
        .select('*')
        .eq('instance_name', instanceName)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (error) throw error;
      return data as EvolutionChat[];
    },
    enabled: !!instanceName,
  });

  // Query para buscar mensagens de um chat específico
  const getMessages = (remoteJid: string | null) => {
    return useQuery({
      queryKey: ['evolution-messages', instanceName, remoteJid],
      queryFn: async () => {
        if (!instanceName || !remoteJid) return [];
        
        const { data, error } = await supabase
          .from('evolution_messages')
          .select('*')
          .eq('instance_name', instanceName)
          .eq('remote_jid', remoteJid)
          .order('timestamp', { ascending: true });

        if (error) throw error;
        return data as EvolutionMessage[];
      },
      enabled: !!instanceName && !!remoteJid,
    });
  };

  // Mutation para sincronizar chats da Evolution API
  const syncChats = useMutation({
    mutationFn: async () => {
      if (!instanceName) throw new Error('Instance name required');

      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'find_chats',
          instance_name: instanceName,
        },
      });

      if (error) throw error;
      
      // Verificar se há indicação de desconexão na resposta
      if (data?.disconnected) {
        throw new Error('WhatsApp desconectado');
      }
      
      if (!data.success) throw new Error(data.error || 'Failed to sync chats');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evolution-chats', instanceName] });
      toast({
        title: 'Conversas sincronizadas!',
        description: `${data.chats} conversas carregadas.`,
      });
    },
    onError: (error) => {
      if (!handleDisconnectionError(error)) {
        toast({
          title: 'Erro ao sincronizar',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
  });

  // Mutation para sincronizar contatos da agenda do WhatsApp
  const syncContacts = useMutation({
    mutationFn: async () => {
      if (!instanceName) throw new Error('Instance name required');

      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'sync_contacts',
          instance_name: instanceName,
        },
      });

      if (error) throw error;
      
      if (data?.disconnected) {
        throw new Error('WhatsApp desconectado');
      }
      
      if (!data.success) throw new Error(data.error || 'Failed to sync contacts');
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['evolution-chats', instanceName] });
      toast({
        title: 'Contatos sincronizados!',
        description: `${data.updated || 0} nomes atualizados.`,
      });
    },
    onError: (error) => {
      if (!handleDisconnectionError(error)) {
        toast({
          title: 'Erro ao sincronizar contatos',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
  });

  // Mutation para sincronizar mensagens de um chat
  const syncMessages = useMutation({
    mutationFn: async (remoteJid: string) => {
      if (!instanceName) throw new Error('Instance name required');

      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'find_messages',
          instance_name: instanceName,
          remote_jid: remoteJid,
        },
      });

      if (error) throw error;
      
      // Verificar se há indicação de desconexão na resposta
      if (data?.disconnected) {
        throw new Error('WhatsApp desconectado');
      }
      
      if (!data.success) throw new Error(data.error || 'Failed to sync messages');
      
      return { ...data, remote_jid: remoteJid };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ 
        queryKey: ['evolution-messages', instanceName, data.remote_jid] 
      });
    },
    onError: (error) => {
      if (!handleDisconnectionError(error)) {
        toast({
          title: 'Erro ao carregar mensagens',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
  });

  // Mutation para enviar mensagem
  const sendMessage = useMutation({
    mutationFn: async ({ remoteJid, text }: { remoteJid: string; text: string }) => {
      if (!instanceName) throw new Error('Instance name required');

      const { data, error } = await supabase.functions.invoke('evolution-api', {
        body: {
          action: 'send_message',
          instance_name: instanceName,
          remote_jid: remoteJid,
          text,
        },
      });

      if (error) throw error;
      
      // Verificar se há indicação de desconexão na resposta
      if (data?.disconnected) {
        throw new Error('WhatsApp desconectado');
      }
      
      if (!data.success) throw new Error(data.error || 'Failed to send message');
      
      return { ...data, remote_jid: remoteJid };
    },
    onSuccess: (data) => {
      // Resincronizar mensagens após enviar
      syncMessages.mutate(data.remote_jid);
      toast({
        title: 'Mensagem enviada!',
      });
    },
    onError: (error) => {
      if (!handleDisconnectionError(error)) {
        toast({
          title: 'Erro ao enviar mensagem',
          description: error instanceof Error ? error.message : 'Erro desconhecido',
          variant: 'destructive',
        });
      }
    },
  });

  // Realtime subscription para novos chats/mensagens
  useEffect(() => {
    if (!instanceName) return;

    // Subscribe to chats changes
    const chatsChannel = supabase
      .channel(`evolution-chats-${instanceName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'evolution_chats',
          filter: `instance_name=eq.${instanceName}`,
        },
        (payload) => {
          console.log('Chat change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['evolution-chats', instanceName] });
        }
      )
      .subscribe((status) => {
        console.log('Chats channel status:', status);
      });

    // Subscribe to messages changes
    const messagesChannel = supabase
      .channel(`evolution-messages-${instanceName}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'evolution_messages',
          filter: `instance_name=eq.${instanceName}`,
        },
        (payload) => {
          console.log('Message change detected:', payload);
          queryClient.invalidateQueries({ queryKey: ['evolution-messages'] });
        }
      )
      .subscribe((status) => {
        console.log('Messages channel status:', status);
      });

    return () => {
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [instanceName, queryClient]);

  // Auto-sync mensagens a cada 30 segundos
  useEffect(() => {
    if (!instanceName) return;

    const interval = setInterval(() => {
      console.log('Auto-syncing chats...');
      syncChats.mutate();
    }, 30000);

    return () => clearInterval(interval);
  }, [instanceName]);

  return {
    chats,
    loadingChats,
    refetchChats,
    getMessages,
    syncChats: syncChats.mutate,
    syncMessages: syncMessages.mutate,
    syncContacts: syncContacts.mutate,
    sendMessage: sendMessage.mutate,
    isSyncing: syncChats.isPending || syncMessages.isPending || syncContacts.isPending,
    isSending: sendMessage.isPending,
  };
}
