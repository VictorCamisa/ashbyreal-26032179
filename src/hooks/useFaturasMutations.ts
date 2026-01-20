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
    mutationFn: async ({ invoiceId, paymentDate, accountId }: { 
      invoiceId: string; 
      paymentDate?: string;
      accountId?: string;
    }) => {
      const date = paymentDate || new Date().toISOString().split('T')[0];
      
      // Update invoice status to PAGA
      const { error: invoiceError } = await supabase
        .from('credit_card_invoices')
        .update({ 
          status: 'PAGA',
          payment_date: date,
        })
        .eq('id', invoiceId);

      if (invoiceError) throw invoiceError;

      // Sync with transactions table using database function
      const { data: transactionId, error: syncError } = await supabase
        .rpc('sync_invoice_to_transaction', { invoice_id: invoiceId });
      
      if (syncError) {
        console.error('Erro ao sincronizar fatura com transactions:', syncError);
        // Don't throw - the invoice was already marked as paid
      } else {
        console.log('Fatura sincronizada com transaction:', transactionId);
      }

      return { success: true, transactionId };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['cartoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
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

      // If status is FECHADA or PAGA, sync with transactions
      if (status === 'FECHADA' || status === 'PAGA') {
        const { data: transactionId, error: syncError } = await supabase
          .rpc('sync_invoice_to_transaction', { invoice_id: invoiceId });
        
        if (syncError) {
          console.error('Erro ao sincronizar fatura com transactions:', syncError);
        } else {
          console.log('Fatura sincronizada com transaction:', transactionId);
        }
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      toast.success('Status atualizado!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status: ' + error.message);
    }
  });

  // Nova mutation para recalcular o total de uma fatura
  const recalculateInvoiceTotal = useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data, error } = await supabase
        .rpc('recalculate_invoice_total', { invoice_id: invoiceId });
      
      if (error) throw error;
      return data;
    },
    onSuccess: (newTotal) => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['card-invoices'] });
      toast.success(`Total recalculado: R$ ${Number(newTotal).toFixed(2)}`);
    },
    onError: (error: any) => {
      toast.error('Erro ao recalcular total: ' + error.message);
    }
  });

  return {
    createFatura: createFatura.mutate,
    isCreating: createFatura.isPending,
    payInvoice: payInvoice.mutate,
    isPaying: payInvoice.isPending,
    updateInvoiceStatus: updateInvoiceStatus.mutate,
    isUpdating: updateInvoiceStatus.isPending,
    recalculateInvoiceTotal: recalculateInvoiceTotal.mutate,
    isRecalculating: recalculateInvoiceTotal.isPending,
  };
}
