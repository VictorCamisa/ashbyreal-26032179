import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useGastosCartao(creditCardId?: string) {
  const { data: gastos, isLoading } = useQuery({
    queryKey: ['credit-card-transactions', creditCardId],
    queryFn: async () => {
      let query = supabase
        .from('credit_card_transactions')
        .select('*, credit_cards(name), categories(name), subcategories(name)')
        .order('purchase_date', { ascending: false });

      if (creditCardId) {
        query = query.eq('credit_card_id', creditCardId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data;
    },
    enabled: !!creditCardId || creditCardId === undefined
  });

  return { 
    gastos, 
    isLoading 
  };
}
