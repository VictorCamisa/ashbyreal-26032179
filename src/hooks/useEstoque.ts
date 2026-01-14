import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ProdutoEstoque {
  id: string;
  nome: string;
  descricao?: string;
  sku?: string;
  categoria?: string;
  estoque: number;
  estoqueMinimo: number;
  preco: number;
  precoCusto: number;
  margemLucro: number;
  unidadeMedida?: string;
  fornecedor?: string;
  localizacao?: string;
  ativo: boolean;
  imagemUrl?: string;
  createdAt: string;
  updatedAt: string;
  // Campos para CHOPP
  tipoProduto: 'PADRAO' | 'CHOPP';
  estoqueLitros: number;
  capacidadeBarril?: number;
}

export interface MovimentacaoEstoque {
  id: string;
  produtoId: string;
  tipo: 'entrada' | 'saida' | 'ajuste';
  quantidade: number;
  quantidadeAnterior: number;
  quantidadeNova: number;
  responsavel: string;
  motivo?: string;
  documento?: string;
  valorUnitario?: number;
  createdAt: string;
}

export function useEstoque() {
  const [produtos, setProdutos] = useState<ProdutoEstoque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProdutos = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .order('nome');

      if (error) throw error;

      setProdutos((data || []).map(transformProduto));
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os produtos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createProduto = async (produto: Partial<ProdutoEstoque>) => {
    try {
      const { error } = await supabase.from('produtos').insert({
        nome: produto.nome,
        descricao: produto.descricao,
        sku: produto.sku,
        categoria: produto.categoria,
        estoque: produto.estoque || 0,
        estoque_minimo: produto.estoqueMinimo || 10,
        preco: produto.preco || 0,
        preco_custo: produto.precoCusto || 0,
        unidade_medida: produto.unidadeMedida || 'UN',
        fornecedor: produto.fornecedor,
        localizacao: produto.localizacao,
        ativo: produto.ativo ?? true,
        imagem_url: produto.imagemUrl,
        // Campos para CHOPP
        tipo_produto: produto.tipoProduto || 'PADRAO',
        estoque_litros: produto.estoqueLitros || 0,
        capacidade_barril: produto.capacidadeBarril,
      });

      if (error) throw error;

      toast({
        title: 'Produto criado',
        description: 'O produto foi adicionado ao estoque',
      });

      await fetchProdutos();
    } catch (error) {
      console.error('Erro ao criar produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o produto',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateProduto = async (id: string, updates: Partial<ProdutoEstoque>) => {
    try {
      const updateData: any = {};
      
      if (updates.nome !== undefined) updateData.nome = updates.nome;
      if (updates.descricao !== undefined) updateData.descricao = updates.descricao;
      if (updates.sku !== undefined) updateData.sku = updates.sku;
      if (updates.categoria !== undefined) updateData.categoria = updates.categoria;
      if (updates.estoque !== undefined) updateData.estoque = updates.estoque;
      if (updates.estoqueMinimo !== undefined) updateData.estoque_minimo = updates.estoqueMinimo;
      if (updates.preco !== undefined) updateData.preco = updates.preco;
      if (updates.precoCusto !== undefined) updateData.preco_custo = updates.precoCusto;
      if (updates.unidadeMedida !== undefined) updateData.unidade_medida = updates.unidadeMedida;
      if (updates.fornecedor !== undefined) updateData.fornecedor = updates.fornecedor;
      if (updates.localizacao !== undefined) updateData.localizacao = updates.localizacao;
      if (updates.ativo !== undefined) updateData.ativo = updates.ativo;
      if (updates.imagemUrl !== undefined) updateData.imagem_url = updates.imagemUrl;
      // Campos para CHOPP
      if (updates.tipoProduto !== undefined) updateData.tipo_produto = updates.tipoProduto;
      if (updates.estoqueLitros !== undefined) updateData.estoque_litros = updates.estoqueLitros;
      if (updates.capacidadeBarril !== undefined) updateData.capacidade_barril = updates.capacidadeBarril;

      const { error } = await supabase
        .from('produtos')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Produto atualizado',
        description: 'As informações foram atualizadas',
      });

      await fetchProdutos();
    } catch (error) {
      console.error('Erro ao atualizar produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o produto',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const registrarEntradaChopp = async (produtoId: string, litros: number, motivo?: string) => {
    try {
      // Buscar produto atual
      const produto = produtos.find(p => p.id === produtoId);
      if (!produto) throw new Error('Produto não encontrado');
      
      const novoEstoqueLitros = produto.estoqueLitros + litros;
      
      // Atualizar estoque de litros
      const { error: updateError } = await supabase
        .from('produtos')
        .update({ estoque_litros: novoEstoqueLitros })
        .eq('id', produtoId);

      if (updateError) throw updateError;

      // Registrar movimentação
      const { error: movError } = await supabase.from('movimentacoes_estoque').insert({
        produto_id: produtoId,
        tipo: 'entrada',
        quantidade: litros,
        quantidade_anterior: produto.estoqueLitros,
        quantidade_nova: novoEstoqueLitros,
        motivo: motivo || 'Entrada de Chopp',
        responsavel: 'Sistema',
      });

      if (movError) throw movError;

      toast({
        title: 'Entrada registrada',
        description: `+${litros}L adicionados ao estoque`,
      });

      await fetchProdutos();
    } catch (error) {
      console.error('Erro ao registrar entrada:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a entrada',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const registrarSaidaChopp = async (produtoId: string, litros: number, motivo?: string) => {
    try {
      const produto = produtos.find(p => p.id === produtoId);
      if (!produto) throw new Error('Produto não encontrado');
      
      const novoEstoqueLitros = produto.estoqueLitros - litros;
      
      if (novoEstoqueLitros < 0) {
        toast({
          title: 'Estoque insuficiente',
          description: `Disponível: ${produto.estoqueLitros}L`,
          variant: 'destructive',
        });
        return false;
      }

      const { error: updateError } = await supabase
        .from('produtos')
        .update({ estoque_litros: novoEstoqueLitros })
        .eq('id', produtoId);

      if (updateError) throw updateError;

      const { error: movError } = await supabase.from('movimentacoes_estoque').insert({
        produto_id: produtoId,
        tipo: 'saida',
        quantidade: litros,
        quantidade_anterior: produto.estoqueLitros,
        quantidade_nova: novoEstoqueLitros,
        motivo: motivo || 'Venda de Chopp',
        responsavel: 'Sistema',
      });

      if (movError) throw movError;

      await fetchProdutos();
      return true;
    } catch (error) {
      console.error('Erro ao registrar saída:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a saída',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const createMovimentacao = async (movimentacao: Omit<MovimentacaoEstoque, 'id' | 'createdAt'>) => {
    try {
      const { error } = await supabase.from('movimentacoes_estoque').insert({
        produto_id: movimentacao.produtoId,
        tipo: movimentacao.tipo,
        quantidade: movimentacao.quantidade,
        quantidade_anterior: movimentacao.quantidadeAnterior,
        quantidade_nova: movimentacao.quantidadeNova,
        responsavel: movimentacao.responsavel,
        motivo: movimentacao.motivo,
      });

      if (error) throw error;

      toast({
        title: 'Movimentação registrada',
        description: 'O estoque foi atualizado',
      });

      await fetchProdutos();
    } catch (error) {
      console.error('Erro ao criar movimentação:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível registrar a movimentação',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteProduto = async (id: string) => {
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ ativo: false })
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Produto excluído',
        description: 'O produto foi removido do estoque',
      });

      await fetchProdutos();
    } catch (error) {
      console.error('Erro ao excluir produto:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o produto',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  return {
    produtos,
    isLoading,
    createProduto,
    updateProduto,
    deleteProduto,
    createMovimentacao,
    registrarEntradaChopp,
    registrarSaidaChopp,
    refetch: fetchProdutos,
  };
}

function transformProduto(data: any): ProdutoEstoque {
  const preco = Number(data.preco || 0);
  const precoCusto = Number(data.preco_custo || 0);
  const margemLucro = preco > 0 ? ((preco - precoCusto) / preco) * 100 : 0;
  
  return {
    id: data.id,
    nome: data.nome,
    descricao: data.descricao,
    sku: data.sku,
    categoria: data.categoria,
    estoque: data.estoque || 0,
    estoqueMinimo: data.estoque_minimo || 10,
    preco,
    precoCusto,
    margemLucro,
    unidadeMedida: data.unidade_medida,
    fornecedor: data.fornecedor,
    localizacao: data.localizacao,
    ativo: data.ativo ?? true,
    imagemUrl: data.imagem_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    // Campos para CHOPP
    tipoProduto: data.tipo_produto || 'PADRAO',
    estoqueLitros: Number(data.estoque_litros || 0),
    capacidadeBarril: data.capacidade_barril,
  };
}
