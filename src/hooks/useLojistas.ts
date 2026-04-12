import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Lojista {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  razao_social: string | null;
  cnpj: string | null;
  inscricao_estadual: string | null;
  inscricao_municipal: string | null;
  regime_tributario: string | null;
  contribuinte_icms: string | null;
  suframa: string | null;
  telefone: string;
  telefone_secundario: string | null;
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
  razao_social?: string;
  cnpj?: string;
  inscricao_estadual?: string;
  inscricao_municipal?: string;
  regime_tributario?: string;
  contribuinte_icms?: string;
  suframa?: string;
  telefone: string;
  telefone_secundario?: string;
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

      // Fetch lojista first to get name for legacy pedido matching
      const lojistaResult = await supabase.from('lojistas').select('*').eq('id', lojistaId).single();
      if (lojistaResult.error) throw lojistaResult.error;
      const lojista = lojistaResult.data as Lojista;

      // Find matching cliente by name (legacy orders use cliente_id, not lojista_id)
      const { data: matchedClientes } = await supabase
        .from('clientes')
        .select('id')
        .ilike('nome', lojista.nome);
      const matchedClienteId = matchedClientes?.[0]?.id || null;

      // Fetch pedidos by lojista_id OR matched cliente_id
      let allPedidos: any[] = [];
      
      // By lojista_id
      const { data: pedidosByLojista } = await supabase
        .from('pedidos')
        .select(`*, pedido_itens (*, produtos (nome, preco))`)
        .eq('lojista_id', lojistaId)
        .order('created_at', { ascending: false });
      allPedidos = pedidosByLojista || [];

      // By matched cliente_id (legacy)
      if (matchedClienteId) {
        const { data: pedidosByCliente } = await supabase
          .from('pedidos')
          .select(`*, pedido_itens (*, produtos (nome, preco))`)
          .eq('cliente_id', matchedClienteId)
          .is('lojista_id', null)
          .order('created_at', { ascending: false });
        
        // Merge without duplicates
        const existingIds = new Set(allPedidos.map(p => p.id));
        (pedidosByCliente || []).forEach(p => {
          if (!existingIds.has(p.id)) allPedidos.push(p);
        });
      }

      // Sort combined results
      allPedidos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const [barrisResult, notasResult] = await Promise.all([
        supabase.from('barris').select('*').eq('lojista_id', lojistaId).order('codigo'),
        supabase.from('documentos_fiscais').select('*').eq('lojista_id', lojistaId).order('created_at', { ascending: false }),
      ]);

      return {
        lojista,
        pedidos: allPedidos,
        barris: barrisResult.data || [],
        notas: notasResult.data || [],
      };
    },
    enabled: !!lojistaId,
  });
}
