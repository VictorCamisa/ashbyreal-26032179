import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useCartoesMutations() {
  const queryClient = useQueryClient();

  const createCartao = useMutation({
    mutationFn: async (newCard: any) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .insert([newCard])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast.success('Cartão criado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar cartão: ' + error.message);
    }
  });

  const updateCartao = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('credit_cards')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast.success('Cartão atualizado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar cartão: ' + error.message);
    }
  });

  return {
    createCartao: createCartao.mutate,
    updateCartao: updateCartao.mutate,
    isCreating: createCartao.isPending,
    isUpdating: updateCartao.isPending
  };
}
