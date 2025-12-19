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

      // Quantas parcelas criar:
      // - Se create_remaining_installments=true e total > 1, criar da parcela atual até a última
      // - Caso contrário, criar apenas a transação atual
      const remainingCount = createRemainingInstallments && totalInstallments > 1
        ? (totalInstallments - installmentNumber + 1)
        : 1;

      // Competência base: se force_competencia foi passada, usa como referência para calcular os meses futuros
      const forceCompRaw = newTransaction.force_competencia as string | undefined;
      const baseCompetenciaDate = forceCompRaw 
        ? new Date(`${forceCompRaw.slice(0, 7)}-15`) // meio do mês para evitar problemas de timezone
        : new Date(newTransaction.purchase_date);

      for (let i = 0; i < remainingCount; i++) {
        // Para a primeira parcela (i=0), usa a data original
        // Para parcelas futuras, avança mês a mês a partir da competência base
        const purchaseDate = new Date(newTransaction.purchase_date);
        const competenciaDate = new Date(baseCompetenciaDate);
        
        if (i > 0) {
          // Avança os meses para as parcelas futuras
          competenciaDate.setMonth(competenciaDate.getMonth() + i);
          purchaseDate.setMonth(purchaseDate.getMonth() + i);
        }
        
        const purchaseDateStr = purchaseDate.toISOString().split('T')[0];
        const currentInstallment = installmentNumber + i;
        
        // Para parcelas futuras (i > 0), a competência é derivada da competência base + meses
        // Para a primeira parcela, usa a competência forçada ou calcula pelo closingDay
        const competencia = i === 0 && forceCompRaw
          ? `${forceCompRaw.slice(0, 7)}-01`
          : `${competenciaDate.getFullYear()}-${String(competenciaDate.getMonth() + 1).padStart(2, '0')}-01`;
        
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
          // Armazenar a competência calculada para usar ao criar faturas
          _competencia: competencia,
        };
        
        transactionsToCreate.push(transaction);
      }

      if (transactionsToCreate.length === 0) {
        console.log('Todas as parcelas já existem, nada a criar');
        return [];
      }

      // Guardar o mapeamento de competências (não vai para o banco, é só para criar faturas)
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
      
      // Atualizar as faturas correspondentes, passando o mapeamento de competências
      if (data && data.length > 0) {
        // Associar cada transação retornada à sua competência
        const transactionsWithCompetencia = data.map((t, idx) => ({
          ...t,
          _competencia: competenciaMap[idx]
        }));
        await updateInvoicesForTransactions(transactionsWithCompetencia, closingDay);
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
  closingDay: number
) {
  // Agrupar transações por cartão e competência
  const groupedTransactions: Record<string, { cardId: string; competencia: string; total: number; transactionIds: string[] }> = {};

  for (const transaction of transactions) {
    // Usa a competência pré-calculada se existir, senão calcula pelo closingDay
    const competencia = transaction._competencia || calculateCompetencia(new Date(transaction.purchase_date), closingDay);
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
