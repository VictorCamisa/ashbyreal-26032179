import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useGastosCartaoMutations() {
  const queryClient = useQueryClient();

  const createGasto = useMutation({
    mutationFn: async (newTransaction: any) => {
      const totalInstallments = newTransaction.total_installments || 1;
      const installmentNumber = newTransaction.installment_number || 1;
      const transactions = [];

      // Se for parcela específica, criar apenas uma transação
      // Se for nova compra parcelada, criar todas as parcelas
      const createAllInstallments = totalInstallments > 1 && installmentNumber === 1;
      const numToCreate = createAllInstallments ? totalInstallments : 1;
      const amountPerInstallment = createAllInstallments 
        ? newTransaction.amount / totalInstallments 
        : newTransaction.amount;

      for (let i = 0; i < numToCreate; i++) {
        const purchaseDate = new Date(newTransaction.purchase_date);
        if (createAllInstallments) {
          purchaseDate.setMonth(purchaseDate.getMonth() + i);
        }
        
        const transaction = {
          credit_card_id: newTransaction.credit_card_id,
          description: newTransaction.description,
          amount: amountPerInstallment,
          purchase_date: purchaseDate.toISOString().split('T')[0],
          installment_number: createAllInstallments ? i + 1 : installmentNumber,
          total_installments: totalInstallments,
          category_id: newTransaction.category_id || null,
          subcategory_id: newTransaction.subcategory_id || null,
          entity_id: newTransaction.entity_id || null,
        };
        
        transactions.push(transaction);
      }

      const { data, error } = await supabase
        .from('credit_card_transactions')
        .insert(transactions)
        .select();
      
      if (error) throw error;
      
      // Atualizar as faturas correspondentes
      if (data && data.length > 0) {
        await updateInvoicesForTransactions(data);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      toast.success('Gasto(s) criado(s) com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar gasto: ' + error.message);
    }
  });

  return {
    createGasto: createGasto.mutateAsync,
    isCreating: createGasto.isPending
  };
}

// Função auxiliar para atualizar valores das faturas
async function updateInvoicesForTransactions(transactions: any[]) {
  // Agrupar transações por cartão e competência
  const groupedTransactions: Record<string, { cardId: string; competencia: string; total: number; transactionIds: string[] }> = {};

  for (const transaction of transactions) {
    const purchaseDate = new Date(transaction.purchase_date);
    const competencia = `${purchaseDate.getFullYear()}-${String(purchaseDate.getMonth() + 1).padStart(2, '0')}-01`;
    const key = `${transaction.credit_card_id}_${competencia}`;

    if (!groupedTransactions[key]) {
      groupedTransactions[key] = {
        cardId: transaction.credit_card_id,
        competencia,
        total: 0,
        transactionIds: []
      };
    }
    groupedTransactions[key].total += transaction.amount;
    groupedTransactions[key].transactionIds.push(transaction.id);
  }

  // Processar cada grupo
  for (const key of Object.keys(groupedTransactions)) {
    const group = groupedTransactions[key];
    
    // Buscar fatura existente para esta competência e cartão
    const { data: existingInvoice } = await supabase
      .from('credit_card_invoices')
      .select('*')
      .eq('credit_card_id', group.cardId)
      .eq('competencia', group.competencia)
      .maybeSingle();
    
    let invoiceId: string;

    if (existingInvoice) {
      // Atualizar valor da fatura existente
      const { error } = await supabase
        .from('credit_card_invoices')
        .update({ 
          total_value: existingInvoice.total_value + group.total 
        })
        .eq('id', existingInvoice.id);
      
      if (error) console.error('Erro ao atualizar fatura:', error);
      invoiceId = existingInvoice.id;
    } else {
      // Buscar informações do cartão para calcular datas
      const { data: card } = await supabase
        .from('credit_cards')
        .select('closing_day, due_day')
        .eq('id', group.cardId)
        .single();
      
      if (card) {
        const competenciaDate = new Date(group.competencia);
        const closingDate = new Date(competenciaDate);
        closingDate.setDate(card.closing_day || 10);
        
        const dueDate = new Date(competenciaDate);
        dueDate.setMonth(dueDate.getMonth() + 1);
        dueDate.setDate(card.due_day || 15);
        
        // Criar nova fatura
        const { data: newInvoice, error } = await supabase
          .from('credit_card_invoices')
          .insert({
            credit_card_id: group.cardId,
            competencia: group.competencia,
            closing_date: closingDate.toISOString().split('T')[0],
            due_date: dueDate.toISOString().split('T')[0],
            total_value: group.total,
            status: 'ABERTA'
          })
          .select()
          .single();
        
        if (error) {
          console.error('Erro ao criar fatura:', error);
          continue;
        }
        invoiceId = newInvoice.id;
      } else {
        continue;
      }
    }

    // Vincular transações à fatura
    const { error: updateError } = await supabase
      .from('credit_card_transactions')
      .update({ invoice_id: invoiceId })
      .in('id', group.transactionIds);
    
    if (updateError) console.error('Erro ao vincular transações:', updateError);
  }
}
