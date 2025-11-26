import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFinanceiro(entityType: 'LOJA' | 'PARTICULAR', referenceMonth: string) {
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

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard-financeiro', entity?.id, referenceMonth],
    enabled: !!entity?.id,
    queryFn: async () => {
      const startDate = `${referenceMonth}-01`;
      const endDate = new Date(referenceMonth + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      const endDateStr = endDate.toISOString().slice(0, 10);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*, categories(name, type)')
        .eq('entity_id', entity?.id)
        .gte('due_date', startDate)
        .lt('due_date', endDateStr);

      if (error) throw error;

      const despesas = transactions
        ?.filter(t => t.tipo === 'PAGAR')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const receitas = transactions
        ?.filter(t => t.tipo === 'RECEBER')
        .reduce((sum, t) => sum + Number(t.amount), 0) || 0;

      const despesasPorCategoria = transactions
        ?.filter(t => t.tipo === 'PAGAR')
        .reduce((acc: any[], t) => {
          const catName = (t.categories as any)?.name || 'Sem categoria';
          const existing = acc.find(c => c.name === catName);
          if (existing) {
            existing.value += Number(t.amount);
          } else {
            acc.push({ name: catName, value: Number(t.amount) });
          }
          return acc;
        }, []) || [];

      return {
        totalDespesas: despesas,
        totalReceitas: receitas,
        resultado: receitas - despesas,
        despesasPorCategoria
      };
    }
  });

  return { dashboardData, isLoading };
}
