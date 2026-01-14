import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Lojista {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  telefone: string;
  email: string | null;
  endereco: any;
  contato_responsavel: string | null;
  observacoes: string | null;
  status: string;
  data_cadastro: string | null;
  created_at: string;
  updated_at: string;
}

export interface LojistaInput {
  nome: string;
  nome_fantasia?: string;
  cnpj?: string;
  telefone: string;
  email?: string;
  endereco?: any;
  contato_responsavel?: string;
  observacoes?: string;
  status?: string;
}

export function useLojistas() {
  const queryClient = useQueryClient();

  const { data: lojistas = [], isLoading, refetch } = useQuery({
    queryKey: ['lojistas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lojistas')
        .select('*')
        .order('nome');

      if (error) throw error;
      return data as Lojista[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (input: LojistaInput) => {
      const { data, error } = await supabase
        .from('lojistas')
        .insert(input)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojistas'] });
      toast.success('Lojista cadastrado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao cadastrar lojista: ' + error.message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: LojistaInput & { id: string }) => {
      const { data, error } = await supabase
        .from('lojistas')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojistas'] });
      toast.success('Lojista atualizado com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar lojista: ' + error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('lojistas')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lojistas'] });
      toast.success('Lojista removido com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover lojista: ' + error.message);
    },
  });

  return {
    lojistas,
    isLoading,
    refetch,
    createLojista: createMutation.mutateAsync,
    updateLojista: updateMutation.mutateAsync,
    deleteLojista: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}

export function useLojistaDetails(lojistaId: string | null) {
  return useQuery({
    queryKey: ['lojista-details', lojistaId],
    queryFn: async () => {
      if (!lojistaId) return null;

      // Fetch lojista with related data
      const [lojistaResult, pedidosResult, barrisResult] = await Promise.all([
        supabase.from('lojistas').select('*').eq('id', lojistaId).single(),
        supabase
          .from('pedidos')
          .select(`
            *,
            pedido_itens (
              *,
              produtos (nome, preco)
            )
          `)
          .eq('lojista_id', lojistaId)
          .order('created_at', { ascending: false }),
        supabase
          .from('barris')
          .select('*')
          .eq('lojista_id', lojistaId)
          .order('codigo'),
      ]);

      if (lojistaResult.error) throw lojistaResult.error;

      return {
        lojista: lojistaResult.data as Lojista,
        pedidos: pedidosResult.data || [],
        barris: barrisResult.data || [],
      };
    },
    enabled: !!lojistaId,
  });
}
