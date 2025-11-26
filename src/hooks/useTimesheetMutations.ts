import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTimesheetMutations() {
  const queryClient = useQueryClient();

  const createEntry = useMutation({
    mutationFn: async (newEntry: any) => {
      const { data, error } = await supabase
        .from('timesheet_entries')
        .insert([newEntry])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extra-hours-summary'] });
      toast.success('Ponto lançado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao lançar ponto: ' + error.message);
    }
  });

  return {
    createEntry: createEntry.mutate,
    isCreating: createEntry.isPending
  };
}
