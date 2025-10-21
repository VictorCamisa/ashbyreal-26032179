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
      const { error } = await supabase
        .from('produtos')
        .update({
          nome: updates.nome,
          descricao: updates.descricao,
          sku: updates.sku,
          categoria: updates.categoria,
          estoque: updates.estoque,
          estoque_minimo: updates.estoqueMinimo,
          preco: updates.preco,
          preco_custo: updates.precoCusto,
          unidade_medida: updates.unidadeMedida,
          fornecedor: updates.fornecedor,
          localizacao: updates.localizacao,
          ativo: updates.ativo,
          imagem_url: updates.imagemUrl,
        })
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
        documento: movimentacao.documento,
        valor_unitario: movimentacao.valorUnitario,
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
    refetch: fetchProdutos,
  };
}

function transformProduto(data: any): ProdutoEstoque {
  return {
    id: data.id,
    nome: data.nome,
    descricao: data.descricao,
    sku: data.sku,
    categoria: data.categoria,
    estoque: data.estoque || 0,
    estoqueMinimo: data.estoque_minimo || 10,
    preco: Number(data.preco || 0),
    precoCusto: Number(data.preco_custo || 0),
    margemLucro: Number(data.margem_lucro || 0),
    unidadeMedida: data.unidade_medida,
    fornecedor: data.fornecedor,
    localizacao: data.localizacao,
    ativo: data.ativo ?? true,
    imagemUrl: data.imagem_url,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
