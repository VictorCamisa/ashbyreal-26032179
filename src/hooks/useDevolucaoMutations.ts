import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface DevolucaoItem {
  itemId: string;
  produtoId: string;
  nomeProduto: string;
  quantidadeOriginal: number;
  quantidadeJaDevolvida: number;
  quantidadeDevolver: number;
  precoUnitario: number;
}

export function useDevolucaoMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const registrarDevolucao = async (
    pedidoId: string,
    items: DevolucaoItem[],
    observacoes?: string
  ) => {
    setIsLoading(true);

    try {
      let totalEstorno = 0;

      // Update each item with the returned quantity
      for (const item of items) {
        if (item.quantidadeDevolver <= 0) continue;

        const novaQuantidadeDevolvida = item.quantidadeJaDevolvida + item.quantidadeDevolver;
        const valorDevolvido = item.quantidadeDevolver * item.precoUnitario;
        totalEstorno += valorDevolvido;

        // Update pedido_itens - the trigger will handle stock restoration
        const { error } = await supabase
          .from('pedido_itens')
          .update({
            quantidade_devolvida: novaQuantidadeDevolvida,
            valor_devolvido: (item.quantidadeJaDevolvida * item.precoUnitario) + valorDevolvido
          })
          .eq('id', item.itemId);

        if (error) throw error;
      }

      // Get entity for LOJA
      const { data: entityData } = await supabase
        .from('entities')
        .select('id')
        .eq('name', 'LOJA')
        .single();

      // Create refund transaction in financial module
      if (totalEstorno > 0) {
        const { error: transactionError } = await supabase
          .from('transactions')
          .insert({
            description: `Estorno Devolução - Pedido #${pedidoId.slice(0, 8)}`,
            amount: totalEstorno,
            tipo: 'PAGAR',
            status: 'PREVISTO',
            due_date: new Date().toISOString().split('T')[0],
            entity_id: entityData?.id,
            origin: 'MANUAL',
            notes: observacoes || 'Devolução de itens consignados',
            origin_reference_id: pedidoId
          });

        if (transactionError) {
          console.error('Erro ao criar transação de estorno:', transactionError);
        }
      }

      toast({
        title: 'Devolução registrada',
        description: `Estorno de R$ ${totalEstorno.toFixed(2)} registrado. Estoque restaurado.`
      });

      return true;
    } catch (error) {
      console.error('Erro ao registrar devolução:', error);
      toast({
        title: 'Erro ao registrar devolução',
        description: 'Não foi possível processar a devolução.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    registrarDevolucao
  };
}
