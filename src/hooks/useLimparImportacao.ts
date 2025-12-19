import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface LimparImportacaoParams {
  creditCardId: string;
  competencia?: string; // formato YYYY-MM, se não informar limpa tudo do cartão
}

export function useLimparImportacao() {
  const queryClient = useQueryClient();

  const limparImportacao = useMutation({
    mutationFn: async ({ creditCardId, competencia }: LimparImportacaoParams) => {
      let deletedTransactions = 0;
      let deletedInvoices = 0;

      if (competencia) {
        // Limpar por competência específica
        // Primeiro buscar o invoice_id da competência
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
        // Calcular a competência como data do primeiro dia do mês
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
        ? `Fatura ${variables.competencia} limpa: ${result.deletedTransactions} transações removidas`
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
