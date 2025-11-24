import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';

type Ticket = Database['public']['Tables']['tickets']['Row'];
type TicketInsert = Database['public']['Tables']['tickets']['Insert'];

export function useTickets() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .order('data_abertura', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar tickets:', error);
      toast({
        title: 'Erro ao carregar tickets',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const createTicket = async (ticket: Omit<TicketInsert, 'user_id'>) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .from('tickets')
        .insert([
          {
            ...ticket,
            user_id: user.id,
          }
        ]);

      if (error) throw error;

      // Enviar dados para o webhook
      try {
        await fetch('https://vssolutions-n8n.fjsxhg.easypanel.host/webhook/d76ae781-72b3-4769-91bc-fd9253c1f8fe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            assunto: ticket.assunto,
            prioridade: ticket.prioridade,
            descricao: ticket.descricao,
          }),
        });
      } catch (webhookError) {
        console.error('Erro ao enviar para webhook:', webhookError);
        // Não bloqueia a criação do ticket se o webhook falhar
      }

      toast({
        title: 'Ticket criado com sucesso!',
        description: 'Nossa equipe entrará em contato em breve.',
      });

      await fetchTickets();
      return { success: true };
    } catch (error: any) {
      console.error('Erro ao criar ticket:', error);
      toast({
        title: 'Erro ao criar ticket',
        description: error.message,
        variant: 'destructive',
      });
      return { success: false, error };
    }
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tickets',
        },
        () => {
          fetchTickets();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return {
    tickets,
    loading,
    createTicket,
    refetch: fetchTickets,
  };
}
