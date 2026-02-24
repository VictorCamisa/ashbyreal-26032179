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
  lojistaId?: string | null;
  barrisEntrega: BarrilEntrega[]; // Cheios saindo da loja para o cliente/lojista
  barrisRetorno: BarrilRetorno[]; // Vazios voltando do cliente/lojista para a loja
}

export function useBarrisMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const movimentarBarris = async (data: MovimentarBarrisData) => {
    setIsLoading(true);

    try {
      // 1. Atualizar barris de entrega (LOJA -> CLIENTE/LOJISTA, CHEIO)
      for (const barril of data.barrisEntrega) {
        // Atualizar o barril
        const { error: updateError } = await supabase
          .from('barris')
          .update({
            localizacao: 'CLIENTE',
            cliente_id: data.lojistaId ? null : data.clienteId,
            lojista_id: data.lojistaId || null,
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

      // 2. Atualizar barris de retorno (CLIENTE/LOJISTA -> LOJA, VAZIO)
      for (const barril of data.barrisRetorno) {
        // Atualizar o barril
        const { error: updateError } = await supabase
          .from('barris')
          .update({
            localizacao: 'LOJA',
            cliente_id: null,
            lojista_id: null,
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
    novaLocalizacao: 'FABRICA' | 'LOJA' | 'CLIENTE' | 'DATTA_VALE' | 'ASHBY',
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
        description: `Barril movido para ${novaLocalizacao === 'LOJA' ? 'loja' : novaLocalizacao === 'DATTA_VALE' ? 'Datta Vale' : novaLocalizacao === 'ASHBY' ? 'Ashby' : novaLocalizacao === 'FABRICA' ? 'fábrica' : 'cliente'}`
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

  // Criar novos barris vindos da fábrica (ENTRADA)
  const criarBarrisDaFabrica = async (
    quantidade: number,
    capacidade: number,
    prefixoCodigo: string = 'BR',
    fabrica: 'DATTA_VALE' | 'ASHBY' = 'DATTA_VALE'
  ) => {
    setIsLoading(true);

    try {
      // Buscar próximo número disponível
      const { data: ultimoBarril } = await supabase
        .from('barris')
        .select('codigo')
        .like('codigo', `${prefixoCodigo}%`)
        .order('codigo', { ascending: false })
        .limit(1);

      let proximoNumero = 1;
      if (ultimoBarril && ultimoBarril.length > 0) {
        const numeroStr = ultimoBarril[0].codigo.replace(prefixoCodigo, '');
        proximoNumero = parseInt(numeroStr, 10) + 1 || 1;
      }

      const barrisCriados: string[] = [];

      for (let i = 0; i < quantidade; i++) {
        const codigo = `${prefixoCodigo}${String(proximoNumero + i).padStart(3, '0')}`;
        
        // Criar barril
        const { data: novoBarril, error: insertError } = await supabase
          .from('barris')
          .insert({
            codigo,
            capacidade,
            localizacao: 'LOJA',
            status_conteudo: 'CHEIO',
            data_ultima_movimentacao: new Date().toISOString()
          })
          .select('id')
          .single();

        if (insertError) throw insertError;

        // Registrar movimentação de entrada
        const { error: movError } = await supabase
          .from('barril_movimentacoes')
          .insert({
            barril_id: novoBarril.id,
            tipo_movimento: 'ENTRADA',
            status_conteudo: 'CHEIO',
            localizacao_anterior: fabrica,
            localizacao_nova: 'LOJA',
            data_movimento: new Date().toISOString(),
            observacoes: `Entrada da fábrica ${fabrica === 'DATTA_VALE' ? 'Datta Vale' : 'Ashby'} - barril novo`
          });

        if (movError) throw movError;
        barrisCriados.push(codigo);
      }

      queryClient.invalidateQueries({ queryKey: ['barris'] });
      queryClient.invalidateQueries({ queryKey: ['barril-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['barris-stats'] });

      toast({
        title: 'Barris criados',
        description: `${quantidade} barril(is) de ${capacidade}L criado(s) da fábrica`
      });

      return barrisCriados;
    } catch (error) {
      console.error('Erro ao criar barris:', error);
      toast({
        title: 'Erro ao criar barris',
        description: 'Não foi possível criar os barris.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Encher barris vazios existentes na loja (ENCHIMENTO)
  const encherBarrisVazios = async (quantidade: number, capacidade: number) => {
    setIsLoading(true);

    try {
      // Buscar barris vazios na loja com a capacidade especificada (FIFO - mais antigos primeiro)
      const { data: barrisVazios, error: fetchError } = await supabase
        .from('barris')
        .select('id, codigo, capacidade')
        .eq('localizacao', 'LOJA')
        .eq('status_conteudo', 'VAZIO')
        .eq('capacidade', capacidade)
        .order('data_ultima_movimentacao', { ascending: true, nullsFirst: true })
        .limit(quantidade);

      if (fetchError) throw fetchError;

      if (!barrisVazios || barrisVazios.length === 0) {
        toast({
          title: 'Nenhum barril vazio',
          description: `Não há barris vazios de ${capacidade}L na loja para encher.`,
          variant: 'destructive'
        });
        return [];
      }

      const barrisEnchidos: string[] = [];

      for (const barril of barrisVazios) {
        // Atualizar status para CHEIO
        const { error: updateError } = await supabase
          .from('barris')
          .update({
            status_conteudo: 'CHEIO',
            data_ultima_movimentacao: new Date().toISOString()
          })
          .eq('id', barril.id);

        if (updateError) throw updateError;

        // Registrar movimentação de enchimento
        const { error: movError } = await supabase
          .from('barril_movimentacoes')
          .insert({
            barril_id: barril.id,
            tipo_movimento: 'ENCHIMENTO',
            status_conteudo: 'CHEIO',
            localizacao_anterior: 'LOJA',
            localizacao_nova: 'LOJA',
            data_movimento: new Date().toISOString(),
            observacoes: 'Barril enchido - entrada da fábrica'
          });

        if (movError) throw movError;
        barrisEnchidos.push(barril.codigo);
      }

      queryClient.invalidateQueries({ queryKey: ['barris'] });
      queryClient.invalidateQueries({ queryKey: ['barril-movimentacoes'] });
      queryClient.invalidateQueries({ queryKey: ['barris-stats'] });

      toast({
        title: 'Barris enchidos',
        description: `${barrisEnchidos.length} barril(is) de ${capacidade}L enchido(s)`
      });

      return barrisEnchidos;
    } catch (error) {
      console.error('Erro ao encher barris:', error);
      toast({
        title: 'Erro ao encher barris',
        description: 'Não foi possível encher os barris.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Processar entrada de chopp do boleto (pergunta se cria novos ou enche existentes)
  const processarEntradaChopp = async (
    quantidade: number,
    capacidade: number,
    modo: 'criar' | 'encher',
    fabrica: 'DATTA_VALE' | 'ASHBY' = 'DATTA_VALE'
  ) => {
    if (modo === 'criar') {
      return await criarBarrisDaFabrica(quantidade, capacidade, 'BR', fabrica);
    } else {
      return await encherBarrisVazios(quantidade, capacidade);
    }
  };

  return {
    isLoading,
    movimentarBarris,
    atualizarStatusBarril,
    transferirBarrilManual,
    criarBarrisDaFabrica,
    encherBarrisVazios,
    processarEntradaChopp
  };
}
