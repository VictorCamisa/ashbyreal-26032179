import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, parseISO, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface CashFlowMonthly {
  monthKey: string; // yyyy-MM
  label: string;    // "Jan 25"
  receitas: number;
  despesas: number;
  saldo: number;
  acumulado: number;
  isProjection: boolean;
}

export function useCashFlowTimeline() {
  return useQuery({
    queryKey: ['cash-flow-timeline-full'],
    queryFn: async (): Promise<CashFlowMonthly[]> => {
      const today = new Date();
      const sixMonthsAfter = addMonths(today, 6);
      const endDateStr = format(endOfMonth(sixMonthsAfter), 'yyyy-MM-dd');

      // Fetch ALL transactions from the beginning to 6 months in the future
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, tipo, due_date, status')
        .lte('due_date', endDateStr)
        .order('due_date', { ascending: true });

      // Also fetch credit card invoices for future obligations
      const { data: cardInvoices } = await supabase
        .from('credit_card_invoices')
        .select('total_value, due_date, status')
        .lte('due_date', endDateStr)
        .order('due_date', { ascending: true });

      if (!transactions?.length) return [];

      // Find earliest transaction date
      const earliestDate = parseISO(transactions[0].due_date);
      const startMonth = startOfMonth(earliestDate);

      // Build monthly buckets from earliest to 6 months in future
      const monthlyData: Record<string, { receitas: number; despesas: number }> = {};
      let cursor = startMonth;
      while (!isAfter(cursor, endOfMonth(sixMonthsAfter))) {
        const key = format(cursor, 'yyyy-MM');
        monthlyData[key] = { receitas: 0, despesas: 0 };
        cursor = addMonths(cursor, 1);
      }

      // Fill with transaction data
      transactions.forEach(t => {
        const key = format(parseISO(t.due_date), 'yyyy-MM');
        if (!monthlyData[key]) return;
        const amount = Math.abs(Number(t.amount));
        if (t.tipo === 'RECEBER') {
          monthlyData[key].receitas += amount;
        } else {
          monthlyData[key].despesas += amount;
        }
      });

      // Add card invoice amounts as despesas
      cardInvoices?.forEach(ci => {
        if (!ci.due_date) return;
        const key = format(parseISO(ci.due_date), 'yyyy-MM');
        if (!monthlyData[key]) return;
        monthlyData[key].despesas += Number(ci.total_value || 0);
      });

      const currentMonthKey = format(today, 'yyyy-MM');

      // Build result with cumulative
      let acumulado = 0;
      const result: CashFlowMonthly[] = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, values]) => {
          const saldo = values.receitas - values.despesas;
          acumulado += saldo;
          const date = parseISO(monthKey + '-01');
          return {
            monthKey,
            label: format(date, "MMM yy", { locale: ptBR }),
            receitas: values.receitas,
            despesas: values.despesas,
            saldo,
            acumulado,
            isProjection: monthKey > currentMonthKey,
          };
        });

      return result;
    },
    staleTime: 5 * 60 * 1000,
  });
}
