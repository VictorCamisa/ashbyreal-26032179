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

  const payInvoice = useMutation({
    mutationFn: async ({ invoiceId, paymentDate }: { invoiceId: string; paymentDate?: string }) => {
      const date = paymentDate || new Date().toISOString().split('T')[0];
      
      // Update invoice status to PAGA
      const { error: invoiceError } = await supabase
        .from('credit_card_invoices')
        .update({ status: 'PAGA' })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['cartoes'] });
      toast.success('Fatura paga com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao pagar fatura: ' + error.message);
    }
  });

  const updateInvoiceStatus = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: 'ABERTA' | 'FECHADA' | 'PAGA' }) => {
      const { error } = await supabase
        .from('credit_card_invoices')
        .update({ status })
        .eq('id', invoiceId);

      if (error) throw error;
      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['card-invoices'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    }
  });

  return {
    createFatura: createFatura.mutate,
    isCreating: createFatura.isPending,
    payInvoice: payInvoice.mutate,
    isPaying: payInvoice.isPending,
    updateInvoiceStatus: updateInvoiceStatus.mutate,
    isUpdating: updateInvoiceStatus.isPending,
  };
}
