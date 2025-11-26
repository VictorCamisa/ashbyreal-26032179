import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useAshbyMutations() {
  const queryClient = useQueryClient();

  const createPedido = useMutation({
    mutationFn: async (newOrder: any) => {
      const { data, error } = await supabase
        .from('ashby_orders')
        .insert([newOrder])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ashby-orders'] });
      toast.success('Pedido criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar pedido: ' + error.message);
    }
  });

  const updatePedido = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('ashby_orders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ashby-orders'] });
      toast.success('Pedido atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar pedido: ' + error.message);
    }
  });

  return {
    createPedido: createPedido.mutate,
    updatePedido: updatePedido.mutate,
    isCreating: createPedido.isPending,
    isUpdating: updatePedido.isPending
  };
}
