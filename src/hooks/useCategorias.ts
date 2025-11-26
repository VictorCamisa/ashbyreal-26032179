import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useCategorias(type?: 'DESPESA' | 'RECEITA') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: async () => {
      let query = supabase.from('categories').select('*').order('name');
      
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data;
    }
  });
}

export function useSubcategorias(categoryId?: string) {
  return useQuery({
    queryKey: ['subcategories', categoryId],
    enabled: !!categoryId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcategories')
        .select('*')
        .eq('category_id', categoryId)
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });
}
