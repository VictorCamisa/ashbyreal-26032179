import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LimparImportacaoParams {
  creditCardId: string;
  competencia?: string; // formato YYYY-MM, se não informar limpa tudo do cartão
  incluirFuturas?: boolean; // se true, também apaga transações de competências futuras geradas por esse import
}

export function useLimparImportacao() {
  const queryClient = useQueryClient();

  const limparImportacao = useMutation({
    mutationFn: async ({ creditCardId, competencia, incluirFuturas = true }: LimparImportacaoParams) => {
      let deletedTransactions = 0;
      let deletedInvoices = 0;

      if (competencia) {
        // Limpar por competência específica
        // Primeiro buscar o invoice da competência
        const { data: invoice } = await supabase
          .from('credit_card_invoices')
          .select('id')
          .eq('credit_card_id', creditCardId)
          .gte('competencia', `${competencia}-01`)
          .lt('competencia', `${competencia}-32`)
          .maybeSingle();

        if (invoice) {
          // Deletar transações dessa fatura
          const { data: txResult } = await supabase
            .from('credit_card_transactions')
            .delete()
            .eq('invoice_id', invoice.id)
            .select('id');
          
          deletedTransactions = txResult?.length || 0;

          // Deletar a fatura
          await supabase
            .from('credit_card_invoices')
            .delete()
            .eq('id', invoice.id);
          
          deletedInvoices = 1;
        }

        // Também deletar transações órfãs (sem invoice_id) dessa competência
        const competenciaStart = `${competencia}-01`;
        const [year, month] = competencia.split('-').map(Number);
        const nextMonth = month === 12 ? 1 : month + 1;
        const nextYear = month === 12 ? year + 1 : year;
        const competenciaEnd = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01`;

        const { data: orphanTx } = await supabase
          .from('credit_card_transactions')
          .delete()
          .eq('credit_card_id', creditCardId)
          .is('invoice_id', null)
          .gte('purchase_date', competenciaStart)
          .lt('purchase_date', competenciaEnd)
          .select('id');

        deletedTransactions += orphanTx?.length || 0;

        // Se incluirFuturas, também apagar faturas e transações de competências POSTERIORES
        if (incluirFuturas) {
          // Buscar faturas posteriores
          const { data: futureInvoices } = await supabase
            .from('credit_card_invoices')
            .select('id')
            .eq('credit_card_id', creditCardId)
            .gt('competencia', `${competencia}-32`);
          
          if (futureInvoices && futureInvoices.length > 0) {
            const futureInvoiceIds = futureInvoices.map(inv => inv.id);
            
            // Deletar transações dessas faturas
            const { data: futureTx } = await supabase
              .from('credit_card_transactions')
              .delete()
              .in('invoice_id', futureInvoiceIds)
              .select('id');
            
            deletedTransactions += futureTx?.length || 0;
            
            // Deletar as faturas
            await supabase
              .from('credit_card_invoices')
              .delete()
              .in('id', futureInvoiceIds);
            
            deletedInvoices += futureInvoices.length;
          }

          // Também transações órfãs futuras
          const { data: futureOrphan } = await supabase
            .from('credit_card_transactions')
            .delete()
            .eq('credit_card_id', creditCardId)
            .is('invoice_id', null)
            .gte('purchase_date', competenciaEnd)
            .select('id');
          
          deletedTransactions += futureOrphan?.length || 0;
        }

      } else {
        // Limpar TUDO do cartão
        const { data: txResult } = await supabase
          .from('credit_card_transactions')
          .delete()
          .eq('credit_card_id', creditCardId)
          .select('id');
        
        deletedTransactions = txResult?.length || 0;

        const { data: invResult } = await supabase
          .from('credit_card_invoices')
          .delete()
          .eq('credit_card_id', creditCardId)
          .select('id');
        
        deletedInvoices = invResult?.length || 0;

        // Limpar histórico de imports
        await supabase
          .from('credit_card_imports')
          .delete()
          .eq('credit_card_id', creditCardId);
      }

      return { deletedTransactions, deletedInvoices };
    },
    onSuccess: (result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['credit-card-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit-card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['card-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['card-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['credit-cards'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
      
      const msg = variables.competencia 
        ? `Fatura ${variables.competencia}${variables.incluirFuturas !== false ? ' e futuras' : ''} limpa: ${result.deletedTransactions} tx, ${result.deletedInvoices} faturas`
        : `Cartão zerado: ${result.deletedTransactions} transações e ${result.deletedInvoices} faturas removidas`;
      
      toast.success(msg);
    },
    onError: (error: any) => {
      toast.error('Erro ao limpar importação: ' + error.message);
    }
  });

  return {
    limparImportacao: limparImportacao.mutateAsync,
    isLimpando: limparImportacao.isPending
  };
}
