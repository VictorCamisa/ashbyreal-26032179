import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export interface BarrilEntrega {
  barrilId: string;
  codigo: string;
}

export interface BarrilRetorno {
  barrilId: string;
  codigo: string;
}

export interface MovimentarBarrisData {
  pedidoId: string;
  clienteId: string;
  barrisEntrega: BarrilEntrega[]; // Cheios saindo da loja para o cliente
  barrisRetorno: BarrilRetorno[]; // Vazios voltando do cliente para a loja
}

export function useBarrisMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const movimentarBarris = async (data: MovimentarBarrisData) => {
    setIsLoading(true);

    try {
      // 1. Atualizar barris de entrega (LOJA -> CLIENTE, CHEIO)
      for (const barril of data.barrisEntrega) {
        // Atualizar o barril
        const { error: updateError } = await supabase
          .from('barris')
          .update({
            localizacao: 'CLIENTE',
            cliente_id: data.clienteId,
            status_conteudo: 'CHEIO',
            data_ultima_movimentacao: new Date().toISOString()
          })
          .eq('id', barril.barrilId);

        if (updateError) throw updateError;

        // Registrar movimentação
        const { error: movError } = await supabase
          .from('barril_movimentacoes')
          .insert({
            barril_id: barril.barrilId,
            pedido_id: data.pedidoId,
            cliente_id: data.clienteId,
            tipo_movimento: 'SAIDA',
            status_conteudo: 'CHEIO',
            localizacao_anterior: 'LOJA',
            localizacao_nova: 'CLIENTE',
            data_movimento: new Date().toISOString()
          });

        if (movError) throw movError;
      }

      // 2. Atualizar barris de retorno (CLIENTE -> LOJA, VAZIO)
      for (const barril of data.barrisRetorno) {
        // Atualizar o barril
        const { error: updateError } = await supabase
          .from('barris')
          .update({
            localizacao: 'LOJA',
            cliente_id: null,
            status_conteudo: 'VAZIO',
            data_ultima_movimentacao: new Date().toISOString()
          })
          .eq('id', barril.barrilId);

        if (updateError) throw updateError;

        // Registrar movimentação
        const { error: movError } = await supabase
          .from('barril_movimentacoes')
          .insert({
            barril_id: barril.barrilId,
            pedido_id: data.pedidoId,
            cliente_id: data.clienteId,
            tipo_movimento: 'RETORNO',
            status_conteudo: 'VAZIO',
            localizacao_anterior: 'CLIENTE',
            localizacao_nova: 'LOJA',
            data_movimento: new Date().toISOString()
          });

        if (movError) throw movError;
      }

      // Invalidar queries
      queryClient.invalidateQueries({ queryKey: ['barris'] });
      queryClient.invalidateQueries({ queryKey: ['barril-movimentacoes'] });

      toast({
        title: 'Barris movimentados',
        description: `${data.barrisEntrega.length} entregue(s), ${data.barrisRetorno.length} retirado(s)`
      });

      return true;
    } catch (error) {
      console.error('Erro ao movimentar barris:', error);
      toast({
        title: 'Erro ao movimentar barris',
        description: 'Não foi possível registrar a movimentação.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const atualizarStatusBarril = async (
    barrilId: string,
    statusConteudo: 'CHEIO' | 'VAZIO'
  ) => {
    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('barris')
        .update({
          status_conteudo: statusConteudo,
          updated_at: new Date().toISOString()
        })
        .eq('id', barrilId);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['barris'] });

      toast({
        title: 'Status atualizado',
        description: `Barril marcado como ${statusConteudo === 'CHEIO' ? 'cheio' : 'vazio'}`
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status do barril.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const transferirBarrilManual = async (
    barrilId: string,
    novaLocalizacao: 'LOJA' | 'CLIENTE',
    clienteId?: string | null,
    observacoes?: string
  ) => {
    setIsLoading(true);

    try {
      // Buscar estado atual do barril
      const { data: barrilAtual, error: fetchError } = await supabase
        .from('barris')
        .select('localizacao, cliente_id')
        .eq('id', barrilId)
        .single();

      if (fetchError) throw fetchError;

      const localizacaoAnterior = barrilAtual.localizacao;
      const clienteAnterior = barrilAtual.cliente_id;

      // Atualizar barril
      const { error: updateError } = await supabase
        .from('barris')
        .update({
          localizacao: novaLocalizacao,
          cliente_id: novaLocalizacao === 'CLIENTE' ? clienteId : null,
          data_ultima_movimentacao: new Date().toISOString()
        })
        .eq('id', barrilId);

      if (updateError) throw updateError;

      // Registrar movimentação manual
      const { error: movError } = await supabase
        .from('barril_movimentacoes')
        .insert({
          barril_id: barrilId,
          cliente_id: novaLocalizacao === 'CLIENTE' ? clienteId : clienteAnterior,
          tipo_movimento: novaLocalizacao === 'CLIENTE' ? 'SAIDA' : 'RETORNO',
          status_conteudo: novaLocalizacao === 'CLIENTE' ? 'CHEIO' : 'VAZIO',
          localizacao_anterior: localizacaoAnterior,
          localizacao_nova: novaLocalizacao,
          data_movimento: new Date().toISOString(),
          observacoes: observacoes || 'Transferência manual'
        });

      if (movError) throw movError;

      queryClient.invalidateQueries({ queryKey: ['barris'] });
      queryClient.invalidateQueries({ queryKey: ['barril-movimentacoes'] });

      toast({
        title: 'Barril transferido',
        description: `Barril movido para ${novaLocalizacao === 'LOJA' ? 'loja' : 'cliente'}`
      });

      return true;
    } catch (error) {
      console.error('Erro ao transferir barril:', error);
      toast({
        title: 'Erro ao transferir',
        description: 'Não foi possível transferir o barril.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    movimentarBarris,
    atualizarStatusBarril,
    transferirBarrilManual
  };
}
