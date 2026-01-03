import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

export interface CampanhaEnvio {
  id: string;
  campanha_id: string;
  cliente_id: string | null;
  cliente_nome: string | null;
  cliente_telefone: string | null;
  remote_jid: string | null;
  status: string;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
}

export interface Campanha {
  id: string;
  nome: string;
  data: string | null;
  publico_alvo: number | null;
  mensagens_enviadas: number | null;
  mensagens_entregues: number | null;
  mensagens_lidas: number | null;
  respostas: number | null;
  taxa_resposta: number | null;
  conversoes: number | null;
  taxa_conversao: number | null;
  status: string | null;
  created_at: string | null;
  instance_id: string | null;
  message_template: string | null;
  media_url: string | null;
  media_type: string | null;
  filters: Record<string, any> | null;
  scheduled_at: string | null;
}

export function useCampanhas() {
  const queryClient = useQueryClient();

  const { data: campanhas = [], isLoading } = useQuery({
    queryKey: ['campanhas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campanhas')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Campanha[];
    },
  });

  const createCampanha = useMutation({
    mutationFn: async (campanha: Partial<Campanha>) => {
      const insertData = {
        nome: campanha.nome || 'Nova Campanha',
        instance_id: campanha.instance_id,
        message_template: campanha.message_template,
        media_url: campanha.media_url,
        media_type: campanha.media_type,
        publico_alvo: campanha.publico_alvo,
        status: campanha.status || 'agendada',
        filters: campanha.filters || {},
        scheduled_at: campanha.scheduled_at,
      };

      const { data, error } = await supabase
        .from('campanhas')
        .insert(insertData)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campanhas'] });
    },
    onError: (error) => {
      console.error('Error creating campaign:', error);
      toast.error('Erro ao criar campanha');
    },
  });

  const createEnvios = useMutation({
    mutationFn: async ({ campanhaId, clientes }: { campanhaId: string; clientes: any[] }) => {
      const envios = clientes.map(cliente => ({
        campanha_id: campanhaId,
        cliente_id: cliente.id,
        cliente_nome: cliente.nome,
        cliente_telefone: cliente.telefone,
        status: 'pendente',
      }));

      const { error } = await supabase
        .from('campanha_envios')
        .insert(envios);

      if (error) throw error;
    },
    onError: (error) => {
      console.error('Error creating envios:', error);
      toast.error('Erro ao preparar envios');
    },
  });

  const startDisparo = useMutation({
    mutationFn: async ({
      campanhaId,
      instanceName,
      clientes,
      messageTemplate,
      mediaUrl,
      mediaType,
    }: {
      campanhaId: string;
      instanceName: string;
      clientes: any[];
      messageTemplate: string;
      mediaUrl?: string;
      mediaType?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke('bulk-send-whatsapp', {
        body: {
          campanhaId,
          instanceName,
          clientes,
          messageTemplate,
          mediaUrl,
          mediaType,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Disparo iniciado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['campanhas'] });
    },
    onError: (error) => {
      console.error('Error starting disparo:', error);
      toast.error('Erro ao iniciar disparo');
    },
  });

  return {
    campanhas,
    isLoading,
    createCampanha,
    createEnvios,
    startDisparo,
  };
}

export function useCampanhaEnvios(campanhaId: string | null) {
  const queryClient = useQueryClient();

  const { data: envios = [], isLoading } = useQuery({
    queryKey: ['campanha-envios', campanhaId],
    queryFn: async () => {
      if (!campanhaId) return [];
      
      const { data, error } = await supabase
        .from('campanha_envios')
        .select('*')
        .eq('campanha_id', campanhaId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data as CampanhaEnvio[];
    },
    enabled: !!campanhaId,
  });

  // Real-time subscription for progress updates
  useEffect(() => {
    if (!campanhaId) return;

    const channel = supabase
      .channel(`campanha-envios-${campanhaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'campanha_envios',
          filter: `campanha_id=eq.${campanhaId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['campanha-envios', campanhaId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [campanhaId, queryClient]);

  const stats = {
    total: envios.length,
    pendente: envios.filter(e => e.status === 'pendente').length,
    enviando: envios.filter(e => e.status === 'enviando').length,
    enviado: envios.filter(e => e.status === 'enviado').length,
    erro: envios.filter(e => e.status === 'erro').length,
  };

  return {
    envios,
    isLoading,
    stats,
  };
}
