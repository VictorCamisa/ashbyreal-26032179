import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface WhatsAppMessage {
  id: string;
  instance_id: string;
  remote_jid: string;
  direction: 'inbound' | 'outbound';
  message_type: 'text' | 'image' | 'audio' | 'video' | 'document' | 'sticker';
  content: string | null;
  media_url: string | null;
  status: string;
  external_id: string | null;
  metadata: {
    sender_name?: string;
    push_name?: string;
    phone_number?: string;
    profile_picture?: string;
  };
  created_at: string;
}

export interface Conversation {
  remote_jid: string;
  contact_name: string;
  phone_number: string;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
  instance_id: string;
}

export function useWhatsAppMessages(instanceId: string | null) {
  const queryClient = useQueryClient();

  // Get all conversations (grouped by remote_jid)
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['whatsapp-conversations', instanceId],
    queryFn: async () => {
      if (!instanceId) return [];

      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('*')
        .eq('instance_id', instanceId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Group messages by remote_jid
      const conversationsMap = new Map<string, Conversation>();

      for (const msg of data || []) {
        const jid = msg.remote_jid;
        
        if (!conversationsMap.has(jid)) {
          // Get contact name from metadata (inbound messages have the sender info)
          const metadata = msg.metadata as WhatsAppMessage['metadata'] || {};
          const contactName = metadata.sender_name || metadata.push_name || metadata.phone_number || jid.split('@')[0];
          
          conversationsMap.set(jid, {
            remote_jid: jid,
            contact_name: contactName,
            phone_number: jid.split('@')[0],
            last_message: msg.content,
            last_message_at: msg.created_at,
            unread_count: 0,
            instance_id: instanceId,
          });
        }

        // Find the best contact name from inbound messages
        if (msg.direction === 'inbound') {
          const conv = conversationsMap.get(jid)!;
          const metadata = msg.metadata as WhatsAppMessage['metadata'] || {};
          const senderName = metadata.sender_name || metadata.push_name;
          
          // Update contact name if this message has a better name
          if (senderName && conv.contact_name === conv.phone_number) {
            conv.contact_name = senderName;
          }
        }
      }

      return Array.from(conversationsMap.values()).sort((a, b) => {
        const dateA = new Date(a.last_message_at || 0).getTime();
        const dateB = new Date(b.last_message_at || 0).getTime();
        return dateB - dateA;
      });
    },
    enabled: !!instanceId,
  });

  // Get messages for a specific conversation
  const getMessages = (remoteJid: string | null) => {
    return useQuery({
      queryKey: ['whatsapp-messages', instanceId, remoteJid],
      queryFn: async () => {
        if (!instanceId || !remoteJid) return [];

        const { data, error } = await supabase
          .from('whatsapp_messages')
          .select('*')
          .eq('instance_id', instanceId)
          .eq('remote_jid', remoteJid)
          .order('created_at', { ascending: true });

        if (error) throw error;
        return data as WhatsAppMessage[];
      },
      enabled: !!instanceId && !!remoteJid,
    });
  };

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({
      instanceName,
      remoteJid,
      message,
      messageType = 'text',
      mediaUrl,
    }: {
      instanceName: string;
      remoteJid: string;
      message: string;
      messageType?: string;
      mediaUrl?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('send-message', {
        body: { instanceName, remoteJid, message, messageType, mediaUrl },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar mensagem: ${error.message}`);
    },
  });

  // Set up realtime subscription
  useEffect(() => {
    if (!instanceId) return;

    const channel = supabase
      .channel('whatsapp-messages-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'whatsapp_messages',
          filter: `instance_id=eq.${instanceId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['whatsapp-messages'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [instanceId, queryClient]);

  return {
    conversations,
    loadingConversations,
    getMessages,
    sendMessage,
  };
}
