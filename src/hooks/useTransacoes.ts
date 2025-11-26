import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useTransacoes(entityType: 'LOJA' | 'PARTICULAR', tipo: 'PAGAR' | 'RECEBER') {
  const { data: entity } = useQuery({
    queryKey: ['entity', entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('type', entityType)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: transacoes, isLoading } = useQuery({
    queryKey: ['transacoes', entity?.id, tipo],
    enabled: !!entity?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('entity_id', entity?.id)
        .eq('tipo', tipo)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  return { transacoes, isLoading };
}
