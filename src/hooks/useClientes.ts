import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Cliente } from '@/types/cliente';
import { toast } from 'sonner';

export function useClientes() {
  const queryClient = useQueryClient();

  const { data: clientes = [], isLoading } = useQuery({
    queryKey: ['clientes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(cliente => ({
        id: cliente.id,
        nome: cliente.nome,
        email: cliente.email,
        telefone: cliente.telefone,
        empresa: cliente.empresa || undefined,
        cpfCnpj: cliente.cpf_cnpj || undefined,
        endereco: cliente.endereco as any,
        status: cliente.status as 'ativo' | 'inativo' | 'lead',
        origem: cliente.origem as 'WhatsApp' | 'Facebook' | 'Instagram' | 'Indicação' | 'Site' | 'Outros',
        ticketMedio: Number(cliente.ticket_medio || 0),
        dataCadastro: cliente.data_cadastro,
        ultimoContato: cliente.ultimo_contato || undefined,
        observacoes: cliente.observacoes || undefined,
        avatar: cliente.avatar || undefined,
        createdAt: cliente.created_at,
        updatedAt: cliente.updated_at,
      })) as Cliente[];
    },
  });

  const createCliente = useMutation({
    mutationFn: async (newCliente: Omit<Cliente, 'id' | 'createdAt' | 'updatedAt'>) => {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nome: newCliente.nome,
          email: newCliente.email,
          telefone: newCliente.telefone,
          empresa: newCliente.empresa,
          cpf_cnpj: newCliente.cpfCnpj,
          endereco: newCliente.endereco,
          status: newCliente.status,
          origem: newCliente.origem,
          ticket_medio: newCliente.ticketMedio,
          observacoes: newCliente.observacoes,
          avatar: newCliente.avatar,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clientes'] });
      toast.success('Cliente criado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao criar cliente: ' + error.message);
    },
  });

  return {
    clientes,
    isLoading,
    createCliente: createCliente.mutate,
    isCreating: createCliente.isPending,
  };
}
