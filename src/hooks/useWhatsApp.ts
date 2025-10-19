import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WhatsAppTemplate {
  id: string;
  nome: string;
  mensagem: string;
  categoria: string;
  variaveis: string[];
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppConversa {
  id: string;
  cliente_id?: string;
  telefone: string;
  nome_contato: string;
  ultima_mensagem?: string;
  ultima_interacao: string;
  status: string;
  nao_lida: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  clientes?: {
    nome: string;
    email: string;
  };
}

export interface WhatsAppMensagem {
  id: string;
  conversa_id?: string;
  cliente_id?: string;
  campanha_id?: string;
  nome_cliente: string;
  mensagem: string;
  status: string;
  tipo: string;
  lida: boolean;
  data_hora: string;
  created_at: string;
}

export interface NovoTemplateData {
  nome: string;
  mensagem: string;
  categoria: string;
  variaveis?: string[];
}

export interface WhatsAppStats {
  totalMensagens: number;
  mensagensEnviadas: number;
  mensagensRecebidas: number;
  taxaEntrega: number;
  taxaResposta: number;
  conversasAtivas: number;
  conversasNaoLidas: number;
}

export function useWhatsApp() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Templates
  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['whatsapp-templates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as WhatsAppTemplate[];
    },
  });

  // Conversas
  const { data: conversas = [], isLoading: loadingConversas } = useQuery({
    queryKey: ['whatsapp-conversas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_conversas')
        .select('*, clientes(nome, email)')
        .order('ultima_interacao', { ascending: false });

      if (error) throw error;
      return data as WhatsAppConversa[];
    },
  });

  // Mensagens por conversa
  const getMensagens = (conversaId: string) => {
    return useQuery({
      queryKey: ['whatsapp-mensagens', conversaId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('mensagens_whatsapp')
          .select('*')
          .eq('conversa_id', conversaId)
          .order('data_hora', { ascending: true });

        if (error) throw error;
        return data as WhatsAppMensagem[];
      },
    });
  };

  // Estatísticas
  const { data: stats } = useQuery({
    queryKey: ['whatsapp-stats'],
    queryFn: async () => {
      const { data: mensagens } = await supabase
        .from('mensagens_whatsapp')
        .select('status, tipo');

      const { count: conversasAtivas } = await supabase
        .from('whatsapp_conversas')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ativa');

      const { count: conversasNaoLidas } = await supabase
        .from('whatsapp_conversas')
        .select('*', { count: 'exact', head: true })
        .eq('nao_lida', true);

      const totalMensagens = mensagens?.length || 0;
      const mensagensEnviadas = mensagens?.filter(m => m.tipo === 'enviada').length || 0;
      const mensagensRecebidas = mensagens?.filter(m => m.tipo === 'recebida').length || 0;
      const entregues = mensagens?.filter(m => ['entregue', 'lida', 'respondida'].includes(m.status)).length || 0;
      const respondidas = mensagens?.filter(m => m.status === 'respondida').length || 0;

      return {
        totalMensagens,
        mensagensEnviadas,
        mensagensRecebidas,
        taxaEntrega: mensagensEnviadas > 0 ? (entregues / mensagensEnviadas) * 100 : 0,
        taxaResposta: mensagensEnviadas > 0 ? (respondidas / mensagensEnviadas) * 100 : 0,
        conversasAtivas: conversasAtivas || 0,
        conversasNaoLidas: conversasNaoLidas || 0,
      } as WhatsAppStats;
    },
  });

  // Criar template
  const criarTemplate = useMutation({
    mutationFn: async (template: NovoTemplateData) => {
      const { data, error } = await supabase
        .from('whatsapp_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-templates'] });
      toast({
        title: 'Template criado!',
        description: 'Template de mensagem criado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar template',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Criar conversa
  const criarConversa = useMutation({
    mutationFn: async (conversa: any) => {
      const { data, error } = await supabase
        .from('whatsapp_conversas')
        .insert([conversa])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
      toast({
        title: 'Conversa criada!',
        description: 'Nova conversa iniciada.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar conversa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Enviar mensagem
  const enviarMensagem = useMutation({
    mutationFn: async (mensagem: any) => {
      const { data, error } = await supabase
        .from('mensagens_whatsapp')
        .insert([mensagem])
        .select()
        .single();

      if (error) throw error;

      // Atualizar última mensagem da conversa
      if (mensagem.conversa_id) {
        await supabase
          .from('whatsapp_conversas')
          .update({
            ultima_mensagem: mensagem.mensagem,
            ultima_interacao: new Date().toISOString(),
          })
          .eq('id', mensagem.conversa_id);
      }

      return data;
    },
    onSuccess: (data) => {
      if (data.conversa_id) {
        queryClient.invalidateQueries({ queryKey: ['whatsapp-mensagens', data.conversa_id] });
      }
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-stats'] });
      toast({
        title: 'Mensagem enviada!',
        description: 'Sua mensagem foi enviada com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao enviar mensagem',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Marcar como lida
  const marcarComoLida = useMutation({
    mutationFn: async (conversaId: string) => {
      const { error } = await supabase
        .from('whatsapp_conversas')
        .update({ nao_lida: false })
        .eq('id', conversaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-conversas'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp-stats'] });
    },
  });

  return {
    templates,
    loadingTemplates,
    conversas,
    loadingConversas,
    stats,
    getMensagens,
    criarTemplate: criarTemplate.mutateAsync,
    criarConversa: criarConversa.mutateAsync,
    enviarMensagem: enviarMensagem.mutateAsync,
    marcarComoLida: marcarComoLida.mutateAsync,
  };
}
