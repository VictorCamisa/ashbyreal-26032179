import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export function useFinanceiroEvolution(entityType: 'LOJA' | 'PARTICULAR') {
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

  const { data: evolutionData, isLoading } = useQuery({
    queryKey: ['financeiro-evolution', entity?.id],
    enabled: !!entity?.id,
    queryFn: async () => {
      // Get last 6 months of data
      const months = [];
      const now = new Date();
      
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          month: date.toISOString().slice(0, 7),
          label: date.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
          year: date.getFullYear()
        });
      }

      const startDate = months[0].month + '-01';
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().slice(0, 10);

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('amount, tipo, due_date')
        .eq('entity_id', entity?.id)
        .gte('due_date', startDate)
        .lt('due_date', endDate);

      if (error) throw error;

      // Group by month
      const monthlyData = months.map(m => {
        const monthTransactions = transactions?.filter(t => {
          const transMonth = t.due_date.slice(0, 7);
          return transMonth === m.month;
        }) || [];

        const receitas = monthTransactions
          .filter(t => t.tipo === 'RECEBER')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        const despesas = monthTransactions
          .filter(t => t.tipo === 'PAGAR')
          .reduce((sum, t) => sum + Number(t.amount), 0);

        return {
          month: m.label.charAt(0).toUpperCase() + m.label.slice(1),
          fullMonth: m.month,
          receitas,
          despesas,
          resultado: receitas - despesas
        };
      });

      // Calculate trends
      const currentMonth = monthlyData[monthlyData.length - 1];
      const previousMonth = monthlyData[monthlyData.length - 2];
      
      const receitaTrend = previousMonth?.receitas > 0 
        ? ((currentMonth?.receitas - previousMonth?.receitas) / previousMonth?.receitas) * 100 
        : 0;
      
      const despesaTrend = previousMonth?.despesas > 0 
        ? ((currentMonth?.despesas - previousMonth?.despesas) / previousMonth?.despesas) * 100 
        : 0;

      // Calculate average monthly result
      const avgResultado = monthlyData.reduce((sum, m) => sum + m.resultado, 0) / monthlyData.length;

      // Calculate savings rate (receitas - despesas / receitas * 100)
      const totalReceitas = monthlyData.reduce((sum, m) => sum + m.receitas, 0);
      const totalDespesas = monthlyData.reduce((sum, m) => sum + m.despesas, 0);
      const savingsRate = totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0;

      return {
        monthlyData,
        trends: {
          receita: receitaTrend,
          despesa: despesaTrend
        },
        avgResultado,
        savingsRate,
        totalReceitas,
        totalDespesas
      };
    }
  });

  return { evolutionData, isLoading };
}
