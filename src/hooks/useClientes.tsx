import { useState, useEffect } from 'react';
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
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  const fetchClientes = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientes((data || []).map(dbRowToCliente));
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao carregar clientes',
        description: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createCliente = async (clienteData: Partial<ClienteInsert>) => {
    try {
      setIsCreating(true);
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

      toast({
        title: 'Cliente criado com sucesso!',
        description: `${data.nome} foi adicionado à base de clientes.`,
      });

      await fetchClientes();
      return data;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao criar cliente',
        description: error.message,
      });
      throw error;
    } finally {
      setIsCreating(false);
    }
  };

  const updateCliente = async (id: string, updates: Partial<ClienteInsert>) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cliente atualizado com sucesso!',
      });

      await fetchClientes();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao atualizar cliente',
        description: error.message,
      });
      throw error;
    }
  };

  const deleteCliente = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Cliente removido com sucesso!',
      });

      await fetchClientes();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao remover cliente',
        description: error.message,
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  return {
    clientes,
    isLoading,
    isCreating,
    createCliente,
    updateCliente,
    deleteCliente,
    refetch: fetchClientes,
  };
}
