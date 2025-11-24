import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Ticket {
  id: string;
  user_id: string;
  assunto: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  status: 'aberto' | 'em_andamento' | 'resolvido' | 'fechado';
  data_abertura: string;
  ultima_atualizacao: string;
  responsavel?: string;
  resolucao?: string;
  anexos?: any;
  created_at: string;
  updated_at: string;
}

export interface NovoTicketData {
  assunto: string;
  descricao: string;
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
}

export function useTickets() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tickets = [], isLoading, refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('data_abertura', { ascending: false });

      if (error) throw error;
      return data as Ticket[];
    },
  });

  const criarTicket = useMutation({
    mutationFn: async (novoTicket: NovoTicketData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('tickets')
        .insert({
          user_id: user.id,
          assunto: novoTicket.assunto,
          descricao: novoTicket.descricao,
          prioridade: novoTicket.prioridade,
        })
        .select()
        .single();

      if (error) throw error;

      // Enviar dados para webhook n8n
      try {
        await fetch('https://vssolutions-n8n.fjsxhg.easypanel.host/webhook/d76ae781-72b3-4769-91bc-fd9253c1f8fe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assunto: data.assunto,
            prioridade: data.prioridade,
            descricao: data.descricao,
          }),
        });
      } catch (webhookError) {
        console.error('Erro ao enviar webhook:', webhookError);
        // Não bloqueia a criação do ticket se o webhook falhar
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast({
        title: 'Ticket criado!',
        description: 'Seu chamado foi registrado com sucesso.',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro ao criar ticket',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    tickets,
    isLoading,
    criarTicket: criarTicket.mutateAsync,
    refetch,
  };
}
