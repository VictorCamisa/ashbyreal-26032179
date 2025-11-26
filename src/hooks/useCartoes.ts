import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCartoes() {
  const { data: cartoes, isLoading: isLoadingCartoes } = useQuery({
    queryKey: ['credit-cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('name');

      if (error) throw error;
      return data;
    }
  });

  const { data: faturas, isLoading: isLoadingFaturas } = useQuery({
    queryKey: ['credit-card-invoices'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .order('competencia', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data;
    }
  });

  return { 
    cartoes, 
    faturas, 
    isLoading: isLoadingCartoes || isLoadingFaturas 
  };
}
