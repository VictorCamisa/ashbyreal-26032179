import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CrmInteracao {
  id: string;
  card_id: string;
  tipo: 'nota' | 'etapa' | 'pedido' | 'conversa' | 'sistema';
  descricao: string;
  autor: string | null;
  created_at: string;
}

/** Linha do tempo do card: o que aconteceu, além das mensagens trocadas. */
export function useCrmInteracoes(cardId: string | null) {
  const queryClient = useQueryClient();

  const { data: interacoes = [], isLoading } = useQuery({
    queryKey: ['crm-interacoes', cardId],
    enabled: !!cardId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_interacoes' as never)
        .select('*')
        .eq('card_id', cardId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CrmInteracao[];
    },
  });

  const adicionarNota = useMutation({
    mutationFn: async ({ descricao, autor }: { descricao: string; autor?: string }) => {
      const { error } = await supabase
        .from('crm_interacoes' as never)
        .insert({ card_id: cardId, tipo: 'nota', descricao, autor: autor ?? 'Equipe' } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-interacoes', cardId] });
      toast.success('Anotação salva.');
    },
    onError: (e) => toast.error('Não foi possível salvar: ' + (e as Error).message),
  });

  return {
    interacoes,
    isLoading,
    adicionarNota: adicionarNota.mutate,
    salvandoNota: adicionarNota.isPending,
  };
}
