import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Database } from '@/integrations/supabase/types';
import type { Cliente } from '@/types/cliente';

type ClienteRow = Database['public']['Tables']['clientes']['Row'];
type ClienteInsert = Database['public']['Tables']['clientes']['Insert'];

// Convert database row to Cliente type
function dbRowToCliente(row: ClienteRow): Cliente {
  return {
    id: row.id,
    nome: row.nome,
    email: row.email,
    telefone: row.telefone,
    empresa: row.empresa || undefined,
    cpfCnpj: row.cpf_cnpj || undefined,
    endereco: row.endereco ? (row.endereco as any) : undefined,
    status: row.status as 'ativo' | 'inativo' | 'lead',
    origem: row.origem as any,
    ticketMedio: row.ticket_medio || 0,
    dataCadastro: row.data_cadastro || '',
    ultimoContato: row.ultimo_contato || undefined,
    observacoes: row.observacoes || undefined,
    avatar: row.avatar || undefined,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || '',
  };
}

export function useClientes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch clientes using React Query
  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []).map(dbRowToCliente);
    },
  });

  // Setup real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('clientes-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'clientes'
        },
        () => {
          // Invalidate queries when any change occurs
          queryClient.invalidateQueries({ queryKey: ['clientes'] });
          queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  // Create cliente mutation
  const createClienteMutation = useMutation({
    mutationFn: async (clienteData: Partial<ClienteInsert>) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nome: clienteData.nome!,
          email: clienteData.email!,
          telefone: clienteData.telefone!,
          empresa: clienteData.empresa,
          status: clienteData.status || 'lead',
          origem: clienteData.origem!,
          observacoes: clienteData.observacoes,
          ticket_medio: clienteData.ticket_medio || 0,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: 'Cliente criado com sucesso!',
        description: `${data.nome} foi adicionado à base de clientes.`,
      });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar cliente',
        description: error.message,
      });
    },
  });

  // Bulk import clientes mutation
  const bulkImportMutation = useMutation({
    mutationFn: async (clientes: Array<{ nome: string; telefone: string; email: string; origem: string; empresa?: string }>) => {
      const clientesData = clientes.map(c => ({
        nome: c.nome,
        email: c.email,
        telefone: c.telefone,
        empresa: c.empresa || null,
        status: 'lead' as const,
        origem: c.origem,
      }));

      const { data, error } = await supabase
        .from('clientes')
        .insert(clientesData)
        .select();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao importar clientes',
        description: error.message,
      });
    },
  });

  // Update cliente mutation
  const updateClienteMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<ClienteInsert> }) => {
      const { error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Cliente atualizado com sucesso!',
      });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
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
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: 'Cliente removido com sucesso!',
      });
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover cliente',
        description: error.message,
      });
    },
  });

  return {
    clientes,
    isLoading,
    isCreating: createClienteMutation.isPending,
    isImporting: bulkImportMutation.isPending,
    createCliente: createClienteMutation.mutateAsync,
    bulkImportClientes: bulkImportMutation.mutateAsync,
    updateCliente: (id: string, updates: Partial<ClienteInsert>) => 
      updateClienteMutation.mutateAsync({ id, updates }),
    deleteCliente: deleteClienteMutation.mutateAsync,
    refetch: () => queryClient.invalidateQueries({ queryKey: ['clientes'] }),
  };
}
