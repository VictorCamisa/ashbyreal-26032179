import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Pedido } from '@/types/pedido';
import { PedidoItem } from '@/types/produto';
import { useToast } from '@/hooks/use-toast';

type PedidoRow = {
  id: string;
  cliente_id: string;
  numero_pedido: number;
  status: string;
  valor_total: number;
  data_pedido: string;
  data_entrega: string | null;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
};

type PedidoItemRow = {
  id: string;
  pedido_id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  produtos?: {
    nome: string;
    descricao: string | null;
    preco: number;
    estoque: number;
    categoria: string | null;
    sku: string | null;
    ativo: boolean;
    imagem_url: string | null;
  };
};

function dbRowToPedido(row: PedidoRow): Pedido & { numeroPedido: number } {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    nomeCliente: '',
    items: [],
    status: row.status as Pedido['status'],
    valorTotal: Number(row.valor_total),
    numeroPedido: row.numero_pedido,
    dataPedido: row.data_pedido,
    dataEntrega: row.data_entrega || undefined,
    observacoes: row.observacoes || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function dbRowToPedidoItem(row: PedidoItemRow): PedidoItem {
  return {
    id: row.id,
    pedidoId: row.pedido_id,
    produtoId: row.produto_id,
    quantidade: row.quantidade,
    precoUnitario: Number(row.preco_unitario),
    subtotal: Number(row.subtotal),
    observacoes: row.observacoes || undefined,
    produto: row.produtos ? {
      id: row.produto_id,
      nome: row.produtos.nome,
      descricao: row.produtos.descricao || undefined,
      preco: Number(row.produtos.preco),
      estoque: row.produtos.estoque,
      categoria: row.produtos.categoria || undefined,
      sku: row.produtos.sku || undefined,
      ativo: row.produtos.ativo,
      imagemUrl: row.produtos.imagem_url || undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function usePedidos(clienteId?: string) {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchPedidos = async () => {
    try {
      setIsLoading(true);
      let query = supabase
        .from('pedidos')
        .select('*')
        .order('data_pedido', { ascending: false });

      if (clienteId) {
        query = query.eq('cliente_id', clienteId);
      }

      const { data, error } = await query;

      if (error) throw error;

      setPedidos((data || []).map(dbRowToPedido));
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os pedidos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPedidoItens = async (pedidoId: string): Promise<PedidoItem[]> => {
    try {
      const { data, error } = await supabase
        .from('pedido_itens')
        .select(`
          *,
          produtos (*)
        `)
        .eq('pedido_id', pedidoId);

      if (error) throw error;

      return (data || []).map(dbRowToPedidoItem);
    } catch (error) {
      console.error('Erro ao buscar itens do pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os itens do pedido',
        variant: 'destructive',
      });
      return [];
    }
  };

  useEffect(() => {
    fetchPedidos();
  }, [clienteId]);

  return { 
    pedidos, 
    isLoading, 
    refetch: fetchPedidos,
    fetchPedidoItens 
  };
}
