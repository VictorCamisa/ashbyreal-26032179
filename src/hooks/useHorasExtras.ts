import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useHorasExtras(referenceMonth: string) {
  const { data: funcionarios } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data;
    }
  });

  const { data: resumos, isLoading } = useQuery({
    queryKey: ['extra-hours-summary', referenceMonth],
    queryFn: async () => {
      const referenceDate = `${referenceMonth}-01`;
      
      const { data, error } = await supabase
        .from('extra_hours_summary')
        .select('*')
        .eq('reference_month', referenceDate);

      if (error) throw error;
      return data;
    }
  });

  return { funcionarios, resumos, isLoading };
}
