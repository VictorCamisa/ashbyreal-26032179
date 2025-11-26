import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFuncionariosMutations() {
  const queryClient = useQueryClient();

  const createFuncionario = useMutation({
    mutationFn: async (newEmployee: any) => {
      const { data, error } = await supabase
        .from('employees')
        .insert([newEmployee])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Funcionário cadastrado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao cadastrar funcionário: ' + error.message);
    }
  });

  return {
    createFuncionario: createFuncionario.mutate,
    isCreating: createFuncionario.isPending
  };
}
