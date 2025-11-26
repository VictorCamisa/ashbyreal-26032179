import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useAccounts(entityId?: string) {
  return useQuery({
    queryKey: ['accounts', entityId],
    queryFn: async () => {
      let query = supabase
        .from('accounts')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (entityId) {
        query = query.eq('entity_id', entityId);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });
}
