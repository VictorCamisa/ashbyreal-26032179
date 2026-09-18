import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export type CrmPipeline = 'comercial' | 'operacao';
export type CrmEtapa =
  | 'lead' | 'contato_feito' | 'em_atendimento'
  | 'b2c' | 'b2b' | 'pedido_aberto' | 'follow_up';
export type CrmTipoContato = 'lojista' | 'cliente_final' | 'desconhecido';

export interface CrmCard {
  id: string;
  nome: string;
  telefone: string | null;
  remote_jid: string | null;
  cliente_id: string | null;
  lojista_id: string | null;
  pedido_aberto_id: string | null;
  tipo_contato: CrmTipoContato;
  pipeline: CrmPipeline;
  etapa: CrmEtapa;
  origem: string | null;
  ultima_mensagem: string | null;
  ultima_mensagem_em: string | null;
  aguardando_resposta: boolean;
  valor_estimado: number | null;
  observacoes: string | null;
  movido_em: string;
  movido_por: 'automatico' | 'manual';
  pedido_numero: number | null;
  pedido_valor: number | null;
  pedido_entrega: string | null;
  pedidos_historico: number | null;
  faturamento_historico: number | null;
  ultimo_pedido_em: string | null;
}

/** Etapas de cada quadro, na ordem em que aparecem. */
export const ETAPAS_POR_PIPELINE: Record<CrmPipeline, { id: CrmEtapa; titulo: string; descricao: string }[]> = {
  comercial: [
    { id: 'lead', titulo: 'Lead', descricao: 'Chegou e ainda não foi respondido' },
    { id: 'contato_feito', titulo: 'Contato feito', descricao: 'Já respondemos, aguardando evolução' },
    { id: 'em_atendimento', titulo: 'Em atendimento', descricao: 'Negociação em andamento' },
  ],
  operacao: [
    { id: 'b2c', titulo: 'B2C', descricao: 'Cliente final na base' },
    { id: 'b2b', titulo: 'B2B', descricao: 'Lojista na base' },
    { id: 'pedido_aberto', titulo: 'Pedido aberto', descricao: 'Pedido em andamento' },
    { id: 'follow_up', titulo: 'Follow up geral', descricao: 'Precisa de retomada' },
  ],
};

export function useCrmQuadro() {
  const queryClient = useQueryClient();

  const { data: cards = [], isLoading } = useQuery({
    queryKey: ['crm-quadro'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_quadro' as never)
        .select('*')
        .order('ultima_mensagem_em', { ascending: false, nullsFirst: false });

      if (error) throw error;

      return ((data ?? []) as unknown as CrmCard[]).map((c) => ({
        ...c,
        valor_estimado: c.valor_estimado === null ? null : Number(c.valor_estimado),
        pedido_valor: c.pedido_valor === null ? null : Number(c.pedido_valor),
        pedidos_historico: Number(c.pedidos_historico ?? 0),
        faturamento_historico: Number(c.faturamento_historico ?? 0),
      }));
    },
  });

  // O quadro muda sozinho (mensagem nova, pedido criado): acompanhar em tempo real
  useEffect(() => {
    const canal = supabase
      .channel('crm-cards-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'crm_cards' }, () => {
        queryClient.invalidateQueries({ queryKey: ['crm-quadro'] });
      })
      .subscribe();
    return () => { supabase.removeChannel(canal); };
  }, [queryClient]);

  const mover = useMutation({
    mutationFn: async ({ id, pipeline, etapa }: { id: string; pipeline: CrmPipeline; etapa: CrmEtapa }) => {
      const { error } = await supabase
        .from('crm_cards' as never)
        .update({ pipeline, etapa, movido_por: 'manual', movido_em: new Date().toISOString() } as never)
        .eq('id', id);
      if (error) throw error;
    },
    onMutate: async ({ id, pipeline, etapa }) => {
      // Movimento no quadro tem que parecer instantâneo
      await queryClient.cancelQueries({ queryKey: ['crm-quadro'] });
      const anterior = queryClient.getQueryData<CrmCard[]>(['crm-quadro']);
      queryClient.setQueryData<CrmCard[]>(['crm-quadro'], (atual) =>
        (atual ?? []).map((c) => (c.id === id ? { ...c, pipeline, etapa, movido_por: 'manual' } : c)));
      return { anterior };
    },
    onError: (erro, _v, ctx) => {
      if (ctx?.anterior) queryClient.setQueryData(['crm-quadro'], ctx.anterior);
      toast.error('Não foi possível mover o card: ' + (erro as Error).message);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['crm-quadro'] }),
  });

  return { cards, isLoading, moverCard: mover.mutate };
}
