import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Função para calcular competência baseada no dia de fechamento do cartão
function calculateCompetencia(purchaseDate: Date, closingDay: number): string {
  const day = purchaseDate.getDate();
  const year = purchaseDate.getFullYear();
  const month = purchaseDate.getMonth();
  
  // Se compra foi APÓS o fechamento, vai para o próximo mês
  if (day > closingDay) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    return `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-01`;
  }
  
  // Se compra foi ATÉ o fechamento, fica no mês atual
  return `${year}-${String(month + 1).padStart(2, '0')}-01`;
}

export function useGastosCartaoMutations() {
  const queryClient = useQueryClient();

  const createGasto = useMutation({
    mutationFn: async (newTransaction: any) => {
      const totalInstallments = newTransaction.total_installments || 1;
      const installmentNumber = newTransaction.installment_number || 1;
      const createRemainingInstallments = newTransaction.create_remaining_installments ?? false;
      const amountRounded = Math.round(Number(newTransaction.amount) * 100) / 100;
      const transactionsToCreate = [];

      // Buscar informações do cartão para usar o closing_day
      const { data: card } = await supabase
        .from('credit_cards')
        .select('closing_day, due_day')
        .eq('id', newTransaction.credit_card_id)
        .single();
      
      const closingDay = card?.closing_day || 10;

      const todayStr = new Date().toISOString().split('T')[0];

      // Quantas parcelas criar:
      // - Se create_remaining_installments=true e total > 1, criar da parcela atual até a última
      // - Caso contrário, criar apenas a transação atual
      const remainingCount = createRemainingInstallments && totalInstallments > 1
        ? (totalInstallments - installmentNumber + 1)
        : 1;

      for (let i = 0; i < remainingCount; i++) {
        const purchaseDate = new Date(newTransaction.purchase_date);
        if (remainingCount > 1) {
          purchaseDate.setMonth(purchaseDate.getMonth() + i);
        }
        const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
        const currentInstallment = installmentNumber + i;
        
        // Regra: nunca criar lançamentos "a mais" no passado.
        // Importa a parcela do CSV (i=0), mas só gera parcelas futuras (i>0) a partir de hoje.
        if (i > 0 && purchaseDateStr < todayStr) {
          continue;
        }
        
        // Calcular competência correta baseada no dia de fechamento
        const competencia = calculateCompetencia(purchaseDate, closingDay);
        
        // Verificar se já existe esta transação (evitar duplicatas na reimportação)
        // Importante: NÃO usar range por competência aqui, porque a competência pode ser "mês seguinte" (pós-fechamento)
        // enquanto o purchase_date continua no mês da compra.
        const { data: existing } = await supabase
          .from('credit_card_transactions')
          .select('id')
          .eq('credit_card_id', newTransaction.credit_card_id)
          .eq('description', newTransaction.description)
          .eq('installment_number', currentInstallment)
          .eq('total_installments', totalInstallments)
          .eq('purchase_date', purchaseDateStr)
          .eq('amount', amountRounded)
          .maybeSingle();
        
        if (existing) {
          console.log(`Parcela ${currentInstallment}/${totalInstallments} de "${newTransaction.description}" já existe, pulando...`);
          continue;
        }
        
        const transaction = {
          credit_card_id: newTransaction.credit_card_id,
          description: newTransaction.description,
          amount: amountRounded,
          purchase_date: purchaseDateStr,
          installment_number: currentInstallment,
          total_installments: totalInstallments,
          category_id: newTransaction.category_id || null,
          subcategory_id: newTransaction.subcategory_id || null,
          entity_id: newTransaction.entity_id || null,
        };
        
        transactionsToCreate.push(transaction);
      }

      if (transactionsToCreate.length === 0) {
        console.log('Todas as parcelas já existem, nada a criar');
        return [];
      }

      const { data, error } = await supabase
        .from('credit_card_transactions')
        .insert(transactionsToCreate)
        .select();
      
      if (error) throw error;
      
      // Se force_competencia estiver presente, forçamos TODAS as transações criadas nessa chamada
      // a entrarem na mesma fatura (útil quando o CSV traz a "data original" da compra/parcela).
      const forcedCompetencia = (() => {
        const raw = newTransaction.force_competencia as string | undefined;
        if (!raw) return undefined;

        // Aceita YYYY-MM, YYYY-MM-01, ou YYYY-MM-DD (normaliza para YYYY-MM-01)
        if (/^\d{4}-\d{2}$/.test(raw)) return `${raw}-01`;
        if (/^\d{4}-\d{2}-01$/.test(raw)) return raw;
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return `${raw.slice(0, 7)}-01`;
        return undefined;
      })();

      // Atualizar as faturas correspondentes
      if (data && data.length > 0) {
        await updateInvoicesForTransactions(data, closingDay, forcedCompetencia);
      }
      
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card-transactions-summary'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
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
async function updateInvoicesForTransactions(
  transactions: any[],
  closingDay: number,
  forcedCompetencia?: string
) {
  // Agrupar transações por cartão e competência
  const groupedTransactions: Record<string, { cardId: string; competencia: string; total: number; transactionIds: string[] }> = {};

  for (const transaction of transactions) {
    const purchaseDate = new Date(transaction.purchase_date);
    // Se foi fornecida competência forçada, use-a; caso contrário, calcule pelo closingDay
    const competencia = forcedCompetencia || calculateCompetencia(purchaseDate, closingDay);
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
      // Buscar informações do cartão para calcular datas de fechamento e vencimento
      const { data: card } = await supabase
        .from('credit_cards')
        .select('closing_day, due_day')
        .eq('id', group.cardId)
        .single();
      
      if (card) {
        const competenciaDate = new Date(group.competencia);
        
        // Data de fechamento = dia do fechamento no mês da competência
        const closingDate = new Date(competenciaDate);
        closingDate.setDate(card.closing_day || 10);
        
        // Data de vencimento = dia de vencimento no mês SEGUINTE à competência
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
