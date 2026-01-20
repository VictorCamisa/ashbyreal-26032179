import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Cliente, Interacao } from '@/types/cliente';
import type { Database } from '@/integrations/supabase/types';

type ClienteRow = Database['public']['Tables']['clientes']['Row'];
type ClienteUpdate = Database['public']['Tables']['clientes']['Update'];

interface Pedido {
  id: string;
  numero_pedido: number;
  status: string;
  valor_total: number;
  data_pedido: string;
  data_entrega: string | null;
  observacoes: string | null;
  metodo_pagamento: string | null;
  itens?: {
    id: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
    produto?: {
      nome: string;
    } | null;
  }[];
}

interface ClienteStats {
  totalPedidos: number;
  valorTotal: number;
  ticketMedio: number;
  pedidosPendentes: number;
  ultimoPedido: string | null;
}

function dbRowToCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    empresa: row.empresa || undefined,
    cpfCnpj: row.cpf_cnpj || undefined,
    endereco: row.endereco ? (row.endereco as Cliente['endereco']) : undefined,
    status: row.status as 'ativo' | 'inativo' | 'lead',
    origem: row.origem as Cliente['origem'],
    ticketMedio: row.ticket_medio || 0,
    dataCadastro: row.data_cadastro || row.created_at || '',
    ultimoContato: row.ultimo_contato || undefined,
    observacoes: row.observacoes || undefined,
    avatar: row.avatar || undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export function useClienteDetalhes(clienteId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cliente
  const { data: cliente, isLoading: isLoadingCliente } = useQuery({
    queryKey: ['cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return null;
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', clienteId)
        .maybeSingle();
      
      if (error) throw error;
      return data ? dbRowToCliente(data) : null;
    },
    enabled: !!clienteId,
  });

  // Fetch interações
  const { data: interacoes = [], isLoading: isLoadingInteracoes } = useQuery({
    queryKey: ['interacoes', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('interacoes')
        .select('*')
        .eq('cliente_id', clienteId)
        .order('data', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((i): Interacao => ({
        id: i.id,
        clienteId: i.cliente_id,
        tipo: i.tipo as Interacao['tipo'],
        descricao: i.descricao,
        data: i.data || i.created_at || '',
        responsavel: i.responsavel || '',
        createdAt: i.created_at || '',
      }));
    },
    enabled: !!clienteId,
  });

  // Fetch pedidos
  const { data: pedidos = [], isLoading: isLoadingPedidos } = useQuery({
    queryKey: ['pedidos-cliente', clienteId],
    queryFn: async () => {
      if (!clienteId) return [];
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          numero_pedido,
          status,
          valor_total,
          data_pedido,
          data_entrega,
          observacoes,
          metodo_pagamento,
          pedido_itens (
            id,
            quantidade,
            preco_unitario,
            subtotal,
            produtos (nome)
          )
        `)
        .eq('cliente_id', clienteId)
        .order('data_pedido', { ascending: false });
      
      if (error) throw error;
      return (data || []).map((p): Pedido => ({
        id: p.id,
        numero_pedido: p.numero_pedido,
        status: p.status || 'pendente',
        valor_total: p.valor_total || 0,
        data_pedido: p.data_pedido || '',
        data_entrega: p.data_entrega,
        observacoes: p.observacoes,
        metodo_pagamento: p.metodo_pagamento,
        itens: p.pedido_itens?.map((item: any) => ({
          id: item.id,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          subtotal: item.subtotal,
          produto: item.produtos,
        })),
      }));
    },
    enabled: !!clienteId,
  });

  // Calculate stats
  const stats: ClienteStats = {
    totalPedidos: pedidos.length,
    valorTotal: pedidos.reduce((acc, p) => acc + (p.valor_total || 0), 0),
    ticketMedio: pedidos.length > 0 
      ? pedidos.reduce((acc, p) => acc + (p.valor_total || 0), 0) / pedidos.length 
      : 0,
    pedidosPendentes: pedidos.filter(p => 
      ['pendente', 'confirmado', 'em_separacao'].includes(p.status)
    ).length,
    ultimoPedido: pedidos[0]?.data_pedido || null,
  };

  // Update cliente mutation
  const updateClienteMutation = useMutation({
    mutationFn: async (updates: Partial<ClienteUpdate>) => {
      if (!clienteId) throw new Error('Cliente ID não encontrado');
      const { error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', clienteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Cliente atualizado com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar cliente',
        description: error.message,
      });
    },
  });

  // Delete cliente mutation
  const deleteClienteMutation = useMutation({
    mutationFn: async () => {
      if (!clienteId) throw new Error('Cliente ID não encontrado');
      
      // Delete related data first
      await supabase.from('ai_conversations').delete().eq('cliente_id', clienteId);
      await supabase.from('leads').delete().eq('cliente_id', clienteId);
      await supabase.from('interacoes').delete().eq('cliente_id', clienteId);
      
      const { error } = await supabase.from('clientes').delete().eq('id', clienteId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Cliente excluído com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao excluir cliente',
        description: error.message,
      });
    },
  });

  // Create interação mutation
  const createInteracaoMutation = useMutation({
    mutationFn: async (data: {
      tipo: string;
      descricao: string;
      responsavel: string;
      data: string;
    }) => {
      if (!clienteId) throw new Error('Cliente ID não encontrado');
      const { error } = await supabase.from('interacoes').insert({
        cliente_id: clienteId,
        tipo: data.tipo,
        descricao: data.descricao,
        responsavel: data.responsavel,
        data: data.data,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Interação registrada com sucesso!' });
      queryClient.invalidateQueries({ queryKey: ['interacoes', clienteId] });
      // Update ultimo_contato
      supabase.from('clientes')
        .update({ ultimo_contato: new Date().toISOString() })
        .eq('id', clienteId);
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao registrar interação',
        description: error.message,
      });
    },
  });

  return {
    cliente,
    interacoes,
    pedidos,
    stats,
    isLoading: isLoadingCliente || isLoadingInteracoes || isLoadingPedidos,
    isLoadingCliente,
    isLoadingPedidos,
    isLoadingInteracoes,
    updateCliente: updateClienteMutation.mutateAsync,
    isUpdating: updateClienteMutation.isPending,
    deleteCliente: deleteClienteMutation.mutateAsync,
    isDeleting: deleteClienteMutation.isPending,
    createInteracao: createInteracaoMutation.mutateAsync,
    isCreatingInteracao: createInteracaoMutation.isPending,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['cliente', clienteId] });
      queryClient.invalidateQueries({ queryKey: ['interacoes', clienteId] });
      queryClient.invalidateQueries({ queryKey: ['pedidos-cliente', clienteId] });
    },
  };
}
