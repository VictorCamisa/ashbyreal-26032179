import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ProdutoDB } from '@/types/produto';
import { useToast } from '@/hooks/use-toast';

type ProdutoRow = {
  id: string;
  nome: string;
  descricao: string | null;
  preco: number;
  estoque: number;
  categoria: string | null;
  sku: string | null;
  ativo: boolean;
  imagem_url: string | null;
  created_at: string;
  updated_at: string;
};

function dbRowToProduto(row: ProdutoRow): ProdutoDB {
  return {
    id: row.id,
    nome: row.nome,
    descricao: row.descricao || undefined,
    preco: Number(row.preco),
    estoque: row.estoque,
    categoria: row.categoria || undefined,
    sku: row.sku || undefined,
    ativo: row.ativo,
    imagemUrl: row.imagem_url || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function useProdutos() {
  const [produtos, setProdutos] = useState<ProdutoDB[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchProdutos = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('ativo', true)
        .order('nome');

      if (error) throw error;

      setProdutos((data || []).map(dbRowToProduto));
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

  useEffect(() => {
    fetchProdutos();
  }, []);

  return { produtos, isLoading, refetch: fetchProdutos };
}
