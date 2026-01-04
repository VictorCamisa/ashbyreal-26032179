import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useTransacoes(entityType: 'LOJA' | 'PARTICULAR', tipo: 'PAGAR' | 'RECEBER') {
  const queryClient = useQueryClient();
  
  const { data: entity } = useQuery({
    queryKey: ['entity', entityType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('type', entityType)
        .single();
      
      if (error) throw error;
      return data;
    }
  });

  const { data: transacoes, isLoading } = useQuery({
    queryKey: ['transacoes', entity?.id, tipo],
    enabled: !!entity?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name, type), accounts(name)')
        .eq('entity_id', entity?.id)
        .eq('tipo', tipo)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  const createMutation = useMutation({
    mutationFn: async (newTransaction: any) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert([newTransaction])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] });
      toast.success('Transação criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar transação: ' + error.message);
    }
  });

  const createMultipleMutation = useMutation({
    mutationFn: async (transactions: any[]) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions)
        .select();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] });
      toast.success(`${data?.length || 0} transações criadas com sucesso!`);
    },
    onError: (error: any) => {
      toast.error('Erro ao criar transações: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] });
      toast.success('Transação atualizada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar transação: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] });
      toast.success('Transação excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir transação: ' + error.message);
    }
  });

  return { 
    transacoes, 
    isLoading,
    entity,
    createTransaction: createMutation.mutate,
    createMultipleTransactions: createMultipleMutation.mutate,
    updateTransaction: updateMutation.mutate,
    deleteTransaction: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isCreatingMultiple: createMultipleMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
