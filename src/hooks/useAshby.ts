import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAshby(year: number, quarter: number) {
  const { data: pedidos, isLoading } = useQuery({
    queryKey: ['ashby-orders', year, quarter],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ashby_orders')
        .select('*')
        .eq('year', year)
        .eq('quarter', quarter)
        .order('order_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  return { pedidos, isLoading };
}
