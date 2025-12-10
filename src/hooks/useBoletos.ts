import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface Boleto {
  id: string;
  transaction_id: string | null;
  entity_id: string;
  description: string | null;
  beneficiario: string | null;
  amount: number;
  due_date: string;
  tipo_nota: 'COM_NOTA' | 'SEM_NOTA';
  status: 'PENDENTE' | 'APROVADO' | 'PAGO' | 'REJEITADO' | 'CANCELADO';
  image_base64: string | null;
  notes: string | null;
  approved_at: string | null;
  approved_by: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  entities?: { name: string; type: string };
  transactions?: { id: string; status: string };
}

export function useBoletos(status?: string) {
  const queryClient = useQueryClient();

  const { data: boletos, isLoading } = useQuery({
    queryKey: ['boletos', status],
    queryFn: async () => {
      let query = supabase
        .from('boletos')
        .select('*, entities(name, type), transactions(id, status)')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as Boleto[];
    },
  });

  const createBoleto = useMutation({
    mutationFn: async (newBoleto: {
      entity_id: string;
      description?: string;
      beneficiario?: string;
      amount: number;
      due_date: string;
      tipo_nota: 'COM_NOTA' | 'SEM_NOTA';
      status?: string;
      image_base64?: string | null;
      notes?: string;
    }) => {
      const { data, error } = await supabase
        .from('boletos')
        .insert([newBoleto])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      toast.success('Boleto cadastrado com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao cadastrar boleto: ' + error.message);
    },
  });

  const updateBoleto = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Boleto> & { id: string }) => {
      const { data, error } = await supabase
        .from('boletos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar boleto: ' + error.message);
    },
  });

  const aprovarBoleto = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('boletos')
        .update({ status: 'APROVADO' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
      toast.success('Boleto aprovado! Transação criada.');
    },
    onError: (error: any) => {
      toast.error('Erro ao aprovar boleto: ' + error.message);
    },
  });

  const pagarBoleto = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('boletos')
        .update({ status: 'PAGO' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
      toast.success('Boleto marcado como pago!');
    },
    onError: (error: any) => {
      toast.error('Erro ao pagar boleto: ' + error.message);
    },
  });

  const rejeitarBoleto = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('boletos')
        .update({ status: 'REJEITADO' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      toast.success('Boleto rejeitado.');
    },
    onError: (error: any) => {
      toast.error('Erro ao rejeitar boleto: ' + error.message);
    },
  });

  const cancelarBoleto = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('boletos')
        .update({ status: 'CANCELADO' })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
      toast.success('Boleto cancelado.');
    },
    onError: (error: any) => {
      toast.error('Erro ao cancelar boleto: ' + error.message);
    },
  });

  const deleteBoleto = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('boletos')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boletos'] });
      toast.success('Boleto excluído.');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir boleto: ' + error.message);
    },
  });

  return {
    boletos,
    isLoading,
    createBoleto: createBoleto.mutate,
    updateBoleto: updateBoleto.mutate,
    aprovarBoleto: aprovarBoleto.mutate,
    pagarBoleto: pagarBoleto.mutate,
    rejeitarBoleto: rejeitarBoleto.mutate,
    cancelarBoleto: cancelarBoleto.mutate,
    deleteBoleto: deleteBoleto.mutate,
    isCreating: createBoleto.isPending,
    isUpdating: updateBoleto.isPending,
  };
}
