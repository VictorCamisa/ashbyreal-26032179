import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useGastosCartaoMutations() {
  const queryClient = useQueryClient();

  const createGasto = useMutation({
    mutationFn: async (newTransaction: any) => {
      const totalInstallments = newTransaction.total_installments || 1;
      const transactions = [];

      // Criar uma transação para cada parcela
      for (let i = 0; i < totalInstallments; i++) {
        const purchaseDate = new Date(newTransaction.purchase_date);
        purchaseDate.setMonth(purchaseDate.getMonth() + i);
        
        const transaction = {
          ...newTransaction,
          installment_number: i + 1,
          purchase_date: purchaseDate.toISOString().split('T')[0],
          amount: newTransaction.amount / totalInstallments // Divide o valor total pelas parcelas
        };
        
        transactions.push(transaction);
      }

      const { data, error } = await supabase
        .from('credit_card_transactions')
        .insert(transactions)
        .select();
      
      if (error) throw error;
      
      // Atualizar as faturas correspondentes
      await updateInvoicesForTransactions(data);
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      toast.success('Gasto(s) criado(s) com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar gasto: ' + error.message);
    }
  });

  return {
    createGasto: createGasto.mutate,
    isCreating: createGasto.isPending
  };
}

// Função auxiliar para atualizar valores das faturas
async function updateInvoicesForTransactions(transactions: any[]) {
  for (const transaction of transactions) {
    const purchaseDate = new Date(transaction.purchase_date);
    const competenciaDate = new Date(purchaseDate);
    
    // A competência é o mês da compra
    const competencia = `${competenciaDate.getFullYear()}-${String(competenciaDate.getMonth() + 1).padStart(2, '0')}-01`;
    
    // Buscar fatura existente para esta competência e cartão
    const { data: existingInvoice } = await supabase
      .from('credit_card_invoices')
      .select('*')
      .eq('credit_card_id', transaction.credit_card_id)
      .eq('competencia', competencia)
      .maybeSingle();
    
    if (existingInvoice) {
      // Atualizar valor da fatura existente
      await supabase
        .from('credit_card_invoices')
        .update({ 
          total_value: existingInvoice.total_value + transaction.amount 
        })
        .eq('id', existingInvoice.id);
    } else {
      // Buscar informações do cartão para calcular datas
      const { data: card } = await supabase
        .from('credit_cards')
        .select('closing_day, due_day')
        .eq('id', transaction.credit_card_id)
        .single();
      
      if (card) {
        const closingDate = new Date(competenciaDate);
        closingDate.setDate(card.closing_day || 10);
        
        const dueDate = new Date(competenciaDate);
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(card.due_day || 15);
        
        // Criar nova fatura
        await supabase
          .from('credit_card_invoices')
          .insert({
            credit_card_id: transaction.credit_card_id,
            competencia,
            closing_date: closingDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            total_value: transaction.amount,
            status: 'ABERTA'
          });
      }
    }
  }
}
