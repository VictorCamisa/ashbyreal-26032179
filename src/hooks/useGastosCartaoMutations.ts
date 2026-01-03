import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * ARQUITETURA SUB-LEDGER DE CARTÕES V2
 * 
 * Princípios:
 * 1. Competência é SEMPRE definida pelo usuário no upload (force_competencia)
 * 2. Parcelas futuras são projetadas a partir dessa competência base
 * 3. NUNCA criamos parcelas retroativas (passado)
 * 4. Cada transação tem um dedupe_key único para evitar duplicatas
 * 5. Compras parceladas são rastreadas via parent_purchase_id
 */

function addMonthsToCompetencia(baseCompetencia: string, monthsToAdd: number): string {
  const [year, month] = baseCompetencia.slice(0, 7).split('-').map(Number);
  const date = new Date(year, month - 1 + monthsToAdd, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`;
}

// Normalizar merchant para fingerprint
function normalizeMerchant(description: string): string {
  return String(description ?? "")
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 50);
}

// Gerar dedupe_key para uma transação
function generateDedupeKey(
  cardId: string,
  competencia: string,
  purchaseDate: string,
  amount: number,
  description: string,
  installmentNum: number,
  installmentTotal: number
): string {
  const normalized = normalizeMerchant(description);
  const amountStr = Math.round(amount * 100).toString();
  return `${cardId}_${competencia}_${purchaseDate}_${amountStr}_${normalized}_${installmentNum}_${installmentTotal}`;
}

// Gerar purchase_fingerprint para uma compra (todas as parcelas compartilham isso)
function generatePurchaseFingerprint(
  cardId: string,
  purchaseDate: string,
  totalAmount: number,
  description: string,
  installmentTotal: number
): string {
  const normalized = normalizeMerchant(description);
  const amountStr = Math.round(totalAmount * 100).toString();
  return `${cardId}_${purchaseDate}_${amountStr}_${normalized}_${installmentTotal}`;
}

export interface CreateGastoInput {
  credit_card_id: string;
  description: string;
  amount: number;
  purchase_date: string;
  installment_number?: number;
  total_installments?: number;
  force_competencia: string;
  create_remaining_installments?: boolean;
  category_id?: string;
  subcategory_id?: string;
  dedupe_key?: string;
  purchase_fingerprint?: string;
  source_import_id?: string;
}

export function useGastosCartaoMutations() {
  const queryClient = useQueryClient();

  const createGasto = useMutation({
    mutationFn: async (input: CreateGastoInput) => {
      const totalInstallments = input.total_installments || 1;
      const installmentNumber = input.installment_number || 1;
      const createRemainingInstallments = input.create_remaining_installments ?? false;
      const amountRounded = Math.round(Number(input.amount) * 100) / 100;
      const transactionsToCreate: any[] = [];

      // Buscar informações do cartão
      const { data: card } = await supabase
        .from('credit_cards')
        .select('closing_day, due_day')
        .eq('id', input.credit_card_id)
        .single();
      
      const closingDay = card?.closing_day || 10;
      const dueDay = card?.due_day || 15;

      // A competência BASE é obrigatoriamente a escolhida pelo usuário
      const forceCompetencia = input.force_competencia;
      if (!forceCompetencia) {
        throw new Error('force_competencia é obrigatória para criar transações');
      }
      
      const baseCompetencia = `${forceCompetencia.slice(0, 7)}-01`;
      const purchaseDateStr = new Date(input.purchase_date).toISOString().split('T')[0];

      // Criar registro de compra parcelada (se aplicável)
      let parentPurchaseId: string | null = null;
      
      if (totalInstallments > 1) {
        const purchaseFingerprint = input.purchase_fingerprint || generatePurchaseFingerprint(
          input.credit_card_id,
          purchaseDateStr,
          amountRounded * totalInstallments,
          input.description,
          totalInstallments
        );

        // Verificar se já existe esta compra
        const { data: existingPurchase } = await supabase
          .from('card_purchases')
          .select('id')
          .eq('purchase_fingerprint', purchaseFingerprint)
          .maybeSingle();

        if (existingPurchase) {
          parentPurchaseId = existingPurchase.id;
        } else {
          // Criar registro de compra
          const { data: newPurchase, error: purchaseError } = await supabase
            .from('card_purchases')
            .insert({
              credit_card_id: input.credit_card_id,
              purchase_fingerprint: purchaseFingerprint,
              merchant_normalized: normalizeMerchant(input.description),
              original_description: input.description,
              total_amount: amountRounded * totalInstallments,
              installments_total: totalInstallments,
              first_installment_date: purchaseDateStr,
              category_id: input.category_id || null,
              status: 'ATIVA',
            })
            .select()
            .single();

          if (purchaseError) {
            console.error('Erro ao criar card_purchase:', purchaseError);
          } else {
            parentPurchaseId = newPurchase?.id || null;
          }
        }
      }

      // Quantas parcelas criar
      const remainingCount = createRemainingInstallments && totalInstallments > 1
        ? (totalInstallments - installmentNumber + 1)
        : 1;

      for (let i = 0; i < remainingCount; i++) {
        const currentInstallmentNumber = installmentNumber + i;
        const competencia = addMonthsToCompetencia(baseCompetencia, i);
        
        // Gerar dedupe_key
        const dedupeKey = input.dedupe_key && i === 0
          ? input.dedupe_key
          : generateDedupeKey(
              input.credit_card_id,
              competencia,
              purchaseDateStr,
              amountRounded,
              input.description,
              currentInstallmentNumber,
              totalInstallments
            );
        
        // Verificar se já existe esta transação
        const { data: existing } = await supabase
          .from('credit_card_transactions')
          .select('id')
          .eq('dedupe_key', dedupeKey)
          .maybeSingle();
        
        if (existing) {
          console.log(`Transação com dedupe_key "${dedupeKey}" já existe, pulando...`);
          continue;
        }
        
        const transaction = {
          credit_card_id: input.credit_card_id,
          description: input.description,
          amount: amountRounded,
          purchase_date: purchaseDateStr,
          competencia,
          installment_number: currentInstallmentNumber,
          total_installments: totalInstallments,
          category_id: input.category_id || null,
          subcategory_id: input.subcategory_id || null,
          dedupe_key: dedupeKey,
          parent_purchase_id: parentPurchaseId,
          source_import_id: input.source_import_id || null,
          item_status: 'IMPORTADO',
          original_amount: totalInstallments > 1 ? amountRounded * totalInstallments : null,
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
      
      // Criar/atualizar as faturas correspondentes
      if (data && data.length > 0) {
        await updateInvoicesForTransactions(data, closingDay, dueDay);
      }
      
      return data;
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        queryClient.invalidateQueries({ queryKey: ['credit-card-transactions'] });
        queryClient.invalidateQueries({ queryKey: ['credit-card-transactions-summary'] });
        queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
        queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
        queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
        queryClient.invalidateQueries({ queryKey: ['card-purchases'] });
      }
    },
    onError: (error: any) => {
      toast.error('Erro ao criar gasto: ' + error.message);
    }
  });

  // Mutation para confirmar import após preview
  const confirmImport = useMutation({
    mutationFn: async ({ importId, recordsImported }: { importId: string; recordsImported: number }) => {
      const { error } = await supabase
        .from('credit_card_imports')
        .update({ 
          status: 'SUCCESS',
          records_imported: recordsImported,
        })
        .eq('id', importId);
      
      if (error) throw error;
    },
  });

  return {
    createGasto: createGasto.mutateAsync,
    isCreating: createGasto.isPending,
    confirmImport: confirmImport.mutateAsync,
    isConfirming: confirmImport.isPending,
  };
}

/**
 * Atualiza ou cria faturas para as transações criadas
 */
async function updateInvoicesForTransactions(
  transactions: any[],
  closingDay: number,
  dueDay: number
) {
  const groupedTransactions: Record<string, { 
    cardId: string; 
    competencia: string; 
    total: number; 
    transactionIds: string[] 
  }> = {};

  for (const transaction of transactions) {
    const competencia = transaction.competencia;
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

  for (const key of Object.keys(groupedTransactions)) {
    const group = groupedTransactions[key];
    
    const { data: existingInvoice } = await supabase
      .from('credit_card_invoices')
      .select('*')
      .eq('credit_card_id', group.cardId)
      .eq('competencia', group.competencia)
      .maybeSingle();
    
    let invoiceId: string;

    if (existingInvoice) {
      const { error } = await supabase
        .from('credit_card_invoices')
        .update({ 
          total_value: existingInvoice.total_value + group.total,
          imported_at: existingInvoice.imported_at || new Date().toISOString(),
        })
        .eq('id', existingInvoice.id);
      
      if (error) console.error('Erro ao atualizar fatura:', error);
      invoiceId = existingInvoice.id;
    } else {
      const competenciaDate = new Date(group.competencia);
      const compYear = competenciaDate.getFullYear();
      const compMonth = competenciaDate.getMonth();
      
      const closingDate = new Date(compYear, compMonth, closingDay);
      
      let dueDateMonth = compMonth;
      let dueDateYear = compYear;
      
      if (dueDay <= closingDay) {
        dueDateMonth += 1;
        if (dueDateMonth > 11) {
          dueDateMonth = 0;
          dueDateYear += 1;
        }
      }
      
      const dueDateObj = new Date(dueDateYear, dueDateMonth, dueDay);
      
      const { data: newInvoice, error } = await supabase
        .from('credit_card_invoices')
        .insert({
          credit_card_id: group.cardId,
          competencia: group.competencia,
          closing_date: closingDate.toISOString().split('T')[0],
          due_date: dueDateObj.toISOString().split('T')[0],
          total_value: group.total,
          status: 'ABERTA',
          imported_at: new Date().toISOString(),
        })
        .select()
        .single();
      
      if (error) {
        console.error('Erro ao criar fatura:', error);
        continue;
      }
      invoiceId = newInvoice.id;
    }

    const { error: updateError } = await supabase
      .from('credit_card_transactions')
      .update({ invoice_id: invoiceId })
      .in('id', group.transactionIds);
    
    if (updateError) console.error('Erro ao vincular transações:', updateError);
  }
}
