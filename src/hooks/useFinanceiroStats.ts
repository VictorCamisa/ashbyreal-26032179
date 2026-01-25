import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subMonths, format, startOfMonth, endOfMonth, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function useFinanceiroStats(referenceMonth: Date = new Date()) {
  // Fetch last 6 months evolution data
  const { data: evolutionData, isLoading: isLoadingEvolution } = useQuery({
    queryKey: ['financeiro-evolution', format(referenceMonth, 'yyyy-MM')],
    queryFn: async () => {
      const months = [];
      for (let i = 5; i >= 0; i--) {
        const monthDate = subMonths(referenceMonth, i);
        const monthStart = format(startOfMonth(monthDate), 'yyyy-MM-dd');
        const monthEnd = format(endOfMonth(monthDate), 'yyyy-MM-dd');
        const monthLabel = format(monthDate, 'MMM', { locale: ptBR });
        
        // Fetch receitas for this month using proper date range
        const { data: receitas } = await supabase
          .from('transactions')
          .select('amount')
          .eq('tipo', 'RECEBER')
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd);

        // Fetch despesas for this month using proper date range
        const { data: despesas } = await supabase
          .from('transactions')
          .select('amount')
          .eq('tipo', 'PAGAR')
          .gte('due_date', monthStart)
          .lte('due_date', monthEnd);

        const totalReceitas = receitas?.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0;
        const totalDespesas = despesas?.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0;

        months.push({
          month: monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1),
          receitas: totalReceitas,
          despesas: totalDespesas,
          saldo: totalReceitas - totalDespesas,
        });
      }
      return months;
    },
  });

  // Fetch alert statistics
  const { data: alertStats, isLoading: isLoadingAlerts } = useQuery({
    queryKey: ['financeiro-alerts', format(referenceMonth, 'yyyy-MM')],
    queryFn: async () => {
      const today = new Date();
      const todayStr = format(today, 'yyyy-MM-dd');
      const sevenDaysLater = format(addDays(today, 7), 'yyyy-MM-dd');

      // Overdue transactions (past due_date, status PREVISTO)
      const { data: overdue } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'PREVISTO')
        .eq('tipo', 'PAGAR')
        .lt('due_date', todayStr);

      // Pending transactions (due in next 7 days, status PREVISTO)
      const { data: pending } = await supabase
        .from('transactions')
        .select('amount')
        .eq('status', 'PREVISTO')
        .eq('tipo', 'PAGAR')
        .gte('due_date', todayStr)
        .lte('due_date', sevenDaysLater);

      // Open credit card invoices
      const { data: invoices } = await supabase
        .from('credit_card_invoices')
        .select('total_value, due_date')
        .in('status', ['ABERTA', 'FECHADA']);

      const overdueCount = overdue?.length || 0;
      const overdueAmount = overdue?.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0;

      const pendingCount = pending?.length || 0;
      const pendingAmount = pending?.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0;

      const invoicesCount = invoices?.length || 0;
      const invoicesAmount = invoices?.reduce((acc, f) => acc + f.total_value, 0) || 0;

      return {
        overdueCount,
        overdueAmount,
        pendingCount,
        pendingAmount,
        invoicesCount,
        invoicesAmount,
      };
    },
  });

  return {
    evolutionData: evolutionData || [],
    alertStats: alertStats || {
      overdueCount: 0,
      overdueAmount: 0,
      pendingCount: 0,
      pendingAmount: 0,
      invoicesCount: 0,
      invoicesAmount: 0,
    },
    isLoading: isLoadingEvolution || isLoadingAlerts,
  };
}
