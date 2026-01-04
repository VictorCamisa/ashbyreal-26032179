import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecurringExpense {
  id: string;
  entity_id: string | null;
  description: string;
  amount: number;
  category_id: string | null;
  subcategory_id: string | null;
  account_id: string | null;
  frequency: string;
  day_of_month: number | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  categories?: { name: string; type: string } | null;
  subcategories?: { name: string } | null;
  accounts?: { name: string } | null;
  entities?: { name: string; type: string } | null;
}

export function useRecurringExpenses() {
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ['recurring-expenses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .select(`
          *,
          categories(name, type),
          subcategories(name),
          accounts(name),
          entities(name, type)
        `)
        .order('description');

      if (error) throw error;
      return data as RecurringExpense[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (expense: Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at' | 'categories' | 'subcategories' | 'accounts' | 'entities'>) => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .insert([expense])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast.success('Despesa fixa criada com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao criar despesa fixa: ' + error.message);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RecurringExpense> & { id: string }) => {
      const { data, error } = await supabase
        .from('recurring_expenses')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast.success('Despesa fixa atualizada!');
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar: ' + error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast.success('Despesa fixa removida!');
    },
    onError: (error: any) => {
      toast.error('Erro ao remover: ' + error.message);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('recurring_expenses')
        .update({ is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['recurring-expenses'] });
      toast.success(variables.is_active ? 'Despesa ativada!' : 'Despesa pausada!');
    },
    onError: (error: any) => {
      toast.error('Erro: ' + error.message);
    }
  });

  return {
    expenses: expenses || [],
    isLoading,
    createExpense: createMutation.mutate,
    updateExpense: updateMutation.mutate,
    deleteExpense: deleteMutation.mutate,
    toggleActive: toggleActiveMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending
  };
}
