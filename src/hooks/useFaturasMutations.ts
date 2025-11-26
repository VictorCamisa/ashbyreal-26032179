import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFaturasMutations() {
  const queryClient = useQueryClient();

  const createFatura = useMutation({
    mutationFn: async (newInvoice: any) => {
      const { data, error } = await supabase
        .from('credit_card_invoices')
        .insert([newInvoice])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      toast.success('Fatura criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar fatura: ' + error.message);
    }
  });

  return {
    createFatura: createFatura.mutate,
    isCreating: createFatura.isPending
  };
}
