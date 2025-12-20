import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Nova lógica de competência:
 * - A competência é SEMPRE definida pelo usuário no upload (force_competencia)
 * - Parcelas futuras são projetadas a partir dessa competência base
 * - NÃO criamos parcelas retroativas (passado)
 */
function addMonthsToCompetencia(baseCompetencia: string, monthsToAdd: number): string {
  // baseCompetencia está no formato "YYYY-MM" ou "YYYY-MM-DD"
  const [year, month] = baseCompetencia.slice(0, 7).split('-').map(Number);
  
  const date = new Date(year, month - 1 + monthsToAdd, 1);
  
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
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

      // Buscar informações do cartão
      const { data: card } = await supabase
        .from('credit_cards')
        .select('closing_day, due_day')
        .eq('id', newTransaction.credit_card_id)
        .single();
      
      const closingDay = card?.closing_day || 10;
      const dueDay = card?.due_day || 15;

      // A competência BASE é obrigatoriamente a escolhida pelo usuário
      const forceCompetencia = newTransaction.force_competencia as string;
      if (!forceCompetencia) {
        throw new Error('force_competencia é obrigatória para criar transações');
      }
      
      const baseCompetencia = `${forceCompetencia.slice(0, 7)}-01`;

      // Quantas parcelas criar FUTURAS:
      // - Se create_remaining_installments=true e total > 1, criar da parcela atual até a última
      // - Caso contrário, criar apenas a parcela atual
      const remainingCount = createRemainingInstallments && totalInstallments > 1
        ? (totalInstallments - installmentNumber + 1)
        : 1;

      for (let i = 0; i < remainingCount; i++) {
        const currentInstallmentNumber = installmentNumber + i;
        
        // Competência para esta parcela:
        // - Parcela atual (i=0) = competência base escolhida pelo usuário
        // - Parcelas futuras (i>0) = competência base + i meses
        const competencia = addMonthsToCompetencia(baseCompetencia, i);
        
        // Data de compra: usamos a data original como referência
        // mas para parcelas futuras ajustamos para manter rastreabilidade
        const purchaseDate = new Date(newTransaction.purchase_date);
        const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
        
        // Verificar se já existe esta transação (evitar duplicatas)
        const { data: existing } = await supabase
          .from('credit_card_transactions')
          .select('id')
          .eq('credit_card_id', newTransaction.credit_card_id)
          .eq('description', newTransaction.description)
          .eq('installment_number', currentInstallmentNumber)
          .eq('total_installments', totalInstallments)
          .eq('amount', amountRounded)
          .maybeSingle();
        
        if (existing) {
          console.log(`Parcela ${currentInstallmentNumber}/${totalInstallments} de "${newTransaction.description}" já existe, pulando...`);
          continue;
        }
        
        const transaction = {
          credit_card_id: newTransaction.credit_card_id,
          description: newTransaction.description,
          amount: amountRounded,
          purchase_date: purchaseDateStr,
          installment_number: currentInstallmentNumber,
          total_installments: totalInstallments,
          category_id: newTransaction.category_id || null,
          subcategory_id: newTransaction.subcategory_id || null,
          entity_id: newTransaction.entity_id || null,
          // Campo auxiliar para criar fatura (não salvo no banco)
          _competencia: competencia,
        };
        
        transactionsToCreate.push(transaction);
      }

      if (transactionsToCreate.length === 0) {
        console.log('Todas as parcelas já existem, nada a criar');
        return [];
      }

      // Guardar o mapeamento de competências (não vai para o banco)
      const competenciaMap: Record<number, string> = {};
      transactionsToCreate.forEach((t, idx) => {
        competenciaMap[idx] = (t as any)._competencia;
        delete (t as any)._competencia;
      });

      const { data, error } = await supabase
        .from('credit_card_transactions')
        .insert(transactionsToCreate)
        .select();
      
      if (error) throw error;
      
      // Criar/atualizar as faturas correspondentes
      if (data && data.length > 0) {
        const transactionsWithCompetencia = data.map((t, idx) => ({
          ...t,
          _competencia: competenciaMap[idx]
        }));
        await updateInvoicesForTransactions(transactionsWithCompetencia, closingDay, dueDay);
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

/**
 * Atualiza ou cria faturas para as transações criadas
 * 
 * NOVA LÓGICA:
 * - closing_date = dia do fechamento no mês da competência
 * - due_date = dia do vencimento, que pode ser no mesmo mês ou no mês seguinte
 *   dependendo se closing_day > due_day (ex: fecha 27, vence 4 = próximo mês)
 */
async function updateInvoicesForTransactions(
  transactions: any[],
  closingDay: number,
  dueDay: number
) {
  // Agrupar transações por cartão e competência
  const groupedTransactions: Record<string, { 
    cardId: string; 
    competencia: string; 
    total: number; 
    transactionIds: string[] 
  }> = {};

  for (const transaction of transactions) {
    const competencia = transaction._competencia;
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
    
    // Buscar fatura existente
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
      // Calcular datas de fechamento e vencimento
      const competenciaDate = new Date(group.competencia);
      const compYear = competenciaDate.getFullYear();
      const compMonth = competenciaDate.getMonth();
      
      // Data de fechamento = dia do fechamento no mês da competência
      const closingDate = new Date(compYear, compMonth, closingDay);
      
      // Data de vencimento:
      // Se due_day < closing_day, o vencimento é no mês SEGUINTE
      // Ex: fecha dia 27, vence dia 4 = próximo mês
      // Ex: fecha dia 12, vence dia 22 = mesmo mês
      let dueDateMonth = compMonth;
      let dueDateYear = compYear;
      
      if (dueDay <= closingDay) {
        // Vencimento no mês seguinte
        dueDateMonth += 1;
        if (dueDateMonth > 11) {
          dueDateMonth = 0;
          dueDateYear += 1;
        }
      }
      
      const dueDateObj = new Date(dueDateYear, dueDateMonth, dueDay);
      
      // Criar nova fatura
      const { data: newInvoice, error } = await supabase
        .from('credit_card_invoices')
        .insert({
          credit_card_id: group.cardId,
          competencia: group.competencia,
          closing_date: closingDate.toISOString().split('T')[0],
          due_date: dueDateObj.toISOString().split('T')[0],
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
    }

    // Vincular transações à fatura
    const { error: updateError } = await supabase
      .from('credit_card_transactions')
      .update({ invoice_id: invoiceId })
      .in('id', group.transactionIds);
    
    if (updateError) console.error('Erro ao vincular transações:', updateError);
  }
}
