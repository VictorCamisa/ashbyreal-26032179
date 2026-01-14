import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface CartItem {
  produtoId: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  estoque: number;
}

export interface CreatePedidoData {
  clienteId: string;
  lojistaId?: string | null;
  items: CartItem[];
  metodoPagamento?: string;
  observacoes?: string;
  dataEntrega?: string;
  valorSinal?: number;
}

export function usePedidosMutations() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const generateNumeroPedido = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 9999).toString().padStart(4, '0');
    return `PED-${year}${month}-${random}`;
  };

  const createPedido = async (data: CreatePedidoData) => {
    setIsLoading(true);

    try {
      const valorTotal = data.items.reduce(
        (acc, item) => acc + item.quantidade * item.precoUnitario,
        0
      );

      // Create the order
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert([{
          cliente_id: data.clienteId,
          lojista_id: data.lojistaId || null,
          status: 'pendente',
          valor_total: valorTotal,
          valor_sinal: data.valorSinal || 0,
          data_pedido: new Date().toISOString(),
          data_entrega: data.dataEntrega ? new Date(data.dataEntrega).toISOString() : null,
          observacoes: data.observacoes || null,
          metodo_pagamento: data.metodoPagamento || null,
          status_history: JSON.stringify([{
            status: 'pendente',
            timestamp: new Date().toISOString(),
            user: 'Sistema'
          }])
        }])
        .select()
        .single();

      if (pedidoError) throw pedidoError;

      // Insert order items - the trigger will automatically deduct stock
      const itemsToInsert = data.items.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        preco_unitario: item.precoUnitario,
        subtotal: item.quantidade * item.precoUnitario
      }));

      const { error: itemsError } = await supabase
        .from('pedido_itens')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({
        title: 'Pedido criado com sucesso!',
        description: `Pedido ${pedido.numero_pedido} no valor de R$ ${valorTotal.toFixed(2)}`
      });

      return pedido;
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: 'Não foi possível criar o pedido. Tente novamente.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updatePedidoStatus = async (
    pedidoId: string,
    newStatus: string,
    currentHistory: any[] = []
  ) => {
    setIsLoading(true);

    try {
      const updatedHistory = [
        ...currentHistory,
        {
          status: newStatus,
          timestamp: new Date().toISOString(),
          user: 'Sistema'
        }
      ];

      const updateData: Record<string, any> = {
        status: newStatus,
        status_history: JSON.stringify(updatedHistory)
      };

      // If marking as paid, set payment date
      if (newStatus === 'pago') {
        updateData.data_pagamento = new Date().toISOString();
      }

      // If marking as delivered, set delivery date
      if (newStatus === 'entregue') {
        updateData.data_entrega = new Date().toISOString();
      }

      const { error } = await supabase
        .from('pedidos')
        .update(updateData)
        .eq('id', pedidoId);

      if (error) throw error;

      const statusLabels: Record<string, string> = {
        pendente: 'Pendente',
        pago: 'Pago',
        entregue: 'Entregue',
        cancelado: 'Cancelado'
      };

      toast({
        title: 'Status atualizado',
        description: `Pedido marcado como ${statusLabels[newStatus] || newStatus}`
      });

      return true;
    } catch (error) {
      console.error('Erro ao atualizar status:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const deletePedido = async (pedidoId: string) => {
    setIsLoading(true);

    try {
      // First, get the pedido to check for linked transaction
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('transaction_id, status')
        .eq('id', pedidoId)
        .single();

      // Cancel linked transaction if exists
      if (pedido?.transaction_id) {
        await supabase
          .from('transactions')
          .update({ status: 'CANCELADO' })
          .eq('id', pedido.transaction_id);
      }

      // Restore stock by setting status to 'cancelado' first (triggers stock restoration)
      if (pedido?.status !== 'cancelado') {
        await supabase
          .from('pedidos')
          .update({ status: 'cancelado' })
          .eq('id', pedidoId);
      }

      // Delete items
      const { error: itemsError } = await supabase
        .from('pedido_itens')
        .delete()
        .eq('pedido_id', pedidoId);

      if (itemsError) throw itemsError;

      // Delete the order
      const { error } = await supabase
        .from('pedidos')
        .delete()
        .eq('id', pedidoId);

      if (error) throw error;

      toast({
        title: 'Pedido excluído',
        description: 'O pedido foi removido e o estoque restaurado.'
      });

      return true;
    } catch (error) {
      console.error('Erro ao excluir pedido:', error);
      toast({
        title: 'Erro ao excluir',
        description: 'Não foi possível excluir o pedido.',
        variant: 'destructive'
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    createPedido,
    updatePedidoStatus,
    deletePedido
  };
}
