import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  differenceInDays,
  isAfter,
  isBefore,
  addDays,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type Regime = 'caixa' | 'competencia';
export type StatusFilter = 'todos' | 'pago' | 'previsto' | 'vencido';

export interface AnaliseFilters {
  regime: Regime;
  statusFilter: StatusFilter;
  categoryId?: string;
  origin?: string;
}

export interface MonthlyData {
  monthKey: string;
  label: string;
  receitas: number;
  despesas: number;
  saldo: number;
  acumulado: number;
  isProjection: boolean;
  receitasPagas: number;
  despesasPagas: number;
  receitasPrevistas: number;
  despesasPrevistas: number;
  inadimplencia: number;
}

export interface AnaliseKPIs {
  // Revenue
  receitaBruta: number;
  receitaLiquida: number;
  ticketMedio: number;
  inadimplencia: number;
  inadimplenciaPct: number;
  // Cash
  saldoAtual: number;
  entradasPeriodo: number;
  saidasPeriodo: number;
  resultadoCaixa: number;
  // Projection
  projecao30d: number;
  projecao60d: number;
  projecao90d: number;
  receitaRecorrenteEsperada: number;
  compromissosFuturos: number;
  // Efficiency
  taxaConversaoPagamento: number;
  tempoMedioPagamento: number;
  // Comparison
  receitaMesAnterior: number;
  receitaMesmoMesAnoAnterior: number;
  crescimentoMensal: number;
  crescimentoAnual: number;
}

export interface AlertaFinanceiro {
  tipo: 'vencido' | 'vence_semana' | 'risco';
  descricao: string;
  valor: number;
  vencimento?: string;
  id: string;
}

export function useAnaliseFinanceira(filters: AnaliseFilters) {
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');

  // Fetch all transactions for comprehensive analysis
  const { data: rawData, isLoading } = useQuery({
    queryKey: ['analise-financeira-raw'],
    queryFn: async () => {
      // Fetch all transactions
      const { data: transactions } = await supabase
        .from('transactions')
        .select('id, amount, tipo, due_date, payment_date, status, origin, category_id, reference_month, description')
        .order('due_date', { ascending: true });

      // Fetch categories for breakdown
      const { data: categories } = await supabase
        .from('categories')
        .select('id, name, type, color');

      // Fetch pending boletos
      const { data: boletos } = await supabase
        .from('boletos')
        .select('id, amount, due_date, status, description, beneficiario')
        .in('status', ['PENDENTE', 'APROVADO']);

      // Fetch open invoices
      const { data: invoices } = await supabase
        .from('credit_card_invoices')
        .select('id, total_value, due_date, status, competencia, credit_card_id, credit_cards(name)')
        .in('status', ['ABERTA', 'FECHADA']);

      // Fetch pedidos for ticket médio
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, valor_total, data_pedido, status, data_pagamento')
        .not('status', 'eq', 'cancelado');

      return {
        transactions: transactions || [],
        categories: categories || [],
        boletos: boletos || [],
        invoices: invoices || [],
        pedidos: pedidos || [],
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  // Process monthly timeline data
  const timelineData = useQuery({
    queryKey: ['analise-financeira-timeline', filters.regime, filters.statusFilter, filters.categoryId, filters.origin],
    enabled: !!rawData,
    queryFn: (): MonthlyData[] => {
      if (!rawData?.transactions.length) return [];

      const { transactions } = rawData;
      const regime = filters.regime;

      // Find date range
      const dates = transactions
        .map(t => regime === 'caixa' ? (t.payment_date || t.due_date) : t.due_date)
        .filter(Boolean)
        .sort();

      if (!dates.length) return [];

      const earliest = startOfMonth(parseISO(dates[0]));
      const projection90d = addMonths(today, 3);
      const currentMonthKey = format(today, 'yyyy-MM');

      // Build monthly buckets
      const monthlyMap: Record<string, {
        receitas: number; despesas: number;
        receitasPagas: number; despesasPagas: number;
        receitasPrevistas: number; despesasPrevistas: number;
        totalEmitido: number; totalVencidoNaoPago: number;
      }> = {};

      let cursor = earliest;
      while (!isAfter(cursor, endOfMonth(projection90d))) {
        const key = format(cursor, 'yyyy-MM');
        monthlyMap[key] = {
          receitas: 0, despesas: 0,
          receitasPagas: 0, despesasPagas: 0,
          receitasPrevistas: 0, despesasPrevistas: 0,
          totalEmitido: 0, totalVencidoNaoPago: 0,
        };
        cursor = addMonths(cursor, 1);
      }

      // Filter and populate
      transactions.forEach(t => {
        if (t.status === 'CANCELADO') return;
        if (filters.categoryId && t.category_id !== filters.categoryId) return;
        if (filters.origin && t.origin !== filters.origin) return;
        if (filters.statusFilter === 'pago' && t.status !== 'PAGO') return;
        if (filters.statusFilter === 'previsto' && t.status !== 'PREVISTO') return;
        if (filters.statusFilter === 'vencido' && !(t.status === 'PREVISTO' && t.due_date < todayStr)) return;

        const dateStr = regime === 'caixa'
          ? (t.status === 'PAGO' ? (t.payment_date || t.due_date) : t.due_date)
          : t.due_date;

        if (!dateStr) return;
        const key = format(parseISO(dateStr), 'yyyy-MM');
        if (!monthlyMap[key]) return;

        const amount = Math.abs(Number(t.amount));

        if (t.tipo === 'RECEBER') {
          monthlyMap[key].receitas += amount;
          monthlyMap[key].totalEmitido += amount;
          if (t.status === 'PAGO') monthlyMap[key].receitasPagas += amount;
          else monthlyMap[key].receitasPrevistas += amount;
          if (t.status === 'PREVISTO' && t.due_date < todayStr) {
            monthlyMap[key].totalVencidoNaoPago += amount;
          }
        } else {
          monthlyMap[key].despesas += amount;
          if (t.status === 'PAGO') monthlyMap[key].despesasPagas += amount;
          else monthlyMap[key].despesasPrevistas += amount;
        }
      });

      // Add future invoice obligations
      if (regime === 'caixa') {
        rawData.invoices.forEach(inv => {
          if (!inv.due_date) return;
          const key = format(parseISO(inv.due_date), 'yyyy-MM');
          if (monthlyMap[key] && key > currentMonthKey) {
            monthlyMap[key].despesas += Number(inv.total_value || 0);
            monthlyMap[key].despesasPrevistas += Number(inv.total_value || 0);
          }
        });
      }

      // Build result with cumulative + projection markers
      let acumulado = 0;
      return Object.entries(monthlyMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([monthKey, v]) => {
          const saldo = v.receitas - v.despesas;
          acumulado += saldo;
          const inadimplencia = v.totalEmitido > 0
            ? (v.totalVencidoNaoPago / v.totalEmitido) * 100
            : 0;

          return {
            monthKey,
            label: format(parseISO(monthKey + '-01'), "MMM yy", { locale: ptBR }),
            receitas: v.receitas,
            despesas: v.despesas,
            saldo,
            acumulado,
            isProjection: monthKey > currentMonthKey,
            receitasPagas: v.receitasPagas,
            despesasPagas: v.despesasPagas,
            receitasPrevistas: v.receitasPrevistas,
            despesasPrevistas: v.despesasPrevistas,
            inadimplencia,
          };
        });
    },
  });

  // Compute KPIs
  const kpis = useQuery({
    queryKey: ['analise-financeira-kpis', filters.regime],
    enabled: !!rawData,
    queryFn: (): AnaliseKPIs => {
      if (!rawData) return {} as AnaliseKPIs;

      const { transactions, pedidos, boletos, invoices } = rawData;
      const currentMonth = format(today, 'yyyy-MM');
      const prevMonth = format(subMonths(today, 1), 'yyyy-MM');
      const sameMonthLastYear = format(subMonths(today, 12), 'yyyy-MM');

      // Filter to current month
      const thisMonthTx = transactions.filter(t => {
        const d = filters.regime === 'caixa' ? (t.payment_date || t.due_date) : t.due_date;
        return d && format(parseISO(d), 'yyyy-MM') === currentMonth && t.status !== 'CANCELADO';
      });

      const prevMonthTx = transactions.filter(t => {
        const d = filters.regime === 'caixa' ? (t.payment_date || t.due_date) : t.due_date;
        return d && format(parseISO(d), 'yyyy-MM') === prevMonth && t.status !== 'CANCELADO';
      });

      const lastYearTx = transactions.filter(t => {
        const d = filters.regime === 'caixa' ? (t.payment_date || t.due_date) : t.due_date;
        return d && format(parseISO(d), 'yyyy-MM') === sameMonthLastYear && t.status !== 'CANCELADO';
      });

      const sumReceitas = (txs: typeof transactions) =>
        txs.filter(t => t.tipo === 'RECEBER').reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
      const sumDespesas = (txs: typeof transactions) =>
        txs.filter(t => t.tipo === 'PAGAR').reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

      const receitaBruta = sumReceitas(thisMonthTx);
      const despesasMes = sumDespesas(thisMonthTx);
      const receitaPrev = sumReceitas(prevMonthTx);
      const receitaLastYear = sumReceitas(lastYearTx);

      // Inadimplência: valor vencido não pago / total emitido
      const totalEmitidoReceber = transactions
        .filter(t => t.tipo === 'RECEBER' && t.status !== 'CANCELADO')
        .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
      const totalVencidoNaoPago = transactions
        .filter(t => t.tipo === 'RECEBER' && t.status === 'PREVISTO' && t.due_date < todayStr)
        .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

      // Ticket médio
      const pedidosPagos = pedidos.filter(p => p.valor_total && p.valor_total > 0);
      const ticketMedio = pedidosPagos.length > 0
        ? pedidosPagos.reduce((a, p) => a + Number(p.valor_total), 0) / pedidosPagos.length
        : 0;

      // Saldo: all paid receitas - all paid despesas
      const allPaidReceitas = transactions
        .filter(t => t.tipo === 'RECEBER' && t.status === 'PAGO')
        .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
      const allPaidDespesas = transactions
        .filter(t => t.tipo === 'PAGAR' && t.status === 'PAGO')
        .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

      // Projections: deterministic (what's already scheduled)
      const futureReceitas = (days: number) =>
        transactions
          .filter(t => t.tipo === 'RECEBER' && t.status === 'PREVISTO' && t.due_date >= todayStr && t.due_date <= format(addDays(today, days), 'yyyy-MM-dd'))
          .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
      const futureDespesas = (days: number) =>
        transactions
          .filter(t => t.tipo === 'PAGAR' && t.status === 'PREVISTO' && t.due_date >= todayStr && t.due_date <= format(addDays(today, days), 'yyyy-MM-dd'))
          .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

      const saldoAtual = allPaidReceitas - allPaidDespesas;
      const inadimplenciaPct = totalEmitidoReceber > 0 ? (totalVencidoNaoPago / totalEmitidoReceber) * 100 : 0;

      // Compromissos futuros (boletos + invoices)
      const compromissosBoletos = boletos.reduce((a, b) => a + Number(b.amount), 0);
      const compromissosInvoices = invoices.reduce((a, i) => a + Number(i.total_value || 0), 0);

      // Recorrentes
      const recorrentes = transactions.filter(t => t.origin === 'RECORRENTE' && t.tipo === 'RECEBER' && t.status === 'PREVISTO');
      const receitaRecorrente = recorrentes.reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

      // Tempo médio de pagamento
      const txWithBothDates = transactions.filter(t => t.due_date && t.payment_date && t.status === 'PAGO');
      const tempoMedio = txWithBothDates.length > 0
        ? txWithBothDates.reduce((a, t) => a + Math.abs(differenceInDays(parseISO(t.payment_date!), parseISO(t.due_date))), 0) / txWithBothDates.length
        : 0;

      // Taxa conversão: pedidos pagos / total pedidos
      const pedidosPagosCount = pedidos.filter(p => p.data_pagamento).length;
      const taxaConversao = pedidos.length > 0 ? (pedidosPagosCount / pedidos.length) * 100 : 0;

      return {
        receitaBruta,
        receitaLiquida: receitaBruta - despesasMes,
        ticketMedio,
        inadimplencia: totalVencidoNaoPago,
        inadimplenciaPct,
        saldoAtual,
        entradasPeriodo: sumReceitas(thisMonthTx.filter(t => t.status === 'PAGO')),
        saidasPeriodo: sumDespesas(thisMonthTx.filter(t => t.status === 'PAGO')),
        resultadoCaixa: sumReceitas(thisMonthTx.filter(t => t.status === 'PAGO')) - sumDespesas(thisMonthTx.filter(t => t.status === 'PAGO')),
        projecao30d: saldoAtual + futureReceitas(30) - futureDespesas(30),
        projecao60d: saldoAtual + futureReceitas(60) - futureDespesas(60),
        projecao90d: saldoAtual + futureReceitas(90) - futureDespesas(90),
        receitaRecorrenteEsperada: receitaRecorrente,
        compromissosFuturos: compromissosBoletos + compromissosInvoices,
        taxaConversaoPagamento: taxaConversao,
        tempoMedioPagamento: tempoMedio,
        receitaMesAnterior: receitaPrev,
        receitaMesmoMesAnoAnterior: receitaLastYear,
        crescimentoMensal: receitaPrev > 0 ? ((receitaBruta - receitaPrev) / receitaPrev) * 100 : 0,
        crescimentoAnual: receitaLastYear > 0 ? ((receitaBruta - receitaLastYear) / receitaLastYear) * 100 : 0,
      };
    },
  });

  // Alerts
  const alertas = useQuery({
    queryKey: ['analise-financeira-alertas'],
    enabled: !!rawData,
    queryFn: (): AlertaFinanceiro[] => {
      if (!rawData) return [];
      const alerts: AlertaFinanceiro[] = [];
      const in7days = format(addDays(today, 7), 'yyyy-MM-dd');

      rawData.transactions
        .filter(t => t.tipo === 'PAGAR' && t.status === 'PREVISTO')
        .forEach(t => {
          if (t.due_date < todayStr) {
            alerts.push({
              tipo: 'vencido',
              descricao: t.description || 'Transação',
              valor: Math.abs(Number(t.amount)),
              vencimento: t.due_date,
              id: t.id,
            });
          } else if (t.due_date <= in7days) {
            alerts.push({
              tipo: 'vence_semana',
              descricao: t.description || 'Transação',
              valor: Math.abs(Number(t.amount)),
              vencimento: t.due_date,
              id: t.id,
            });
          }
        });

      // Risk: saldo current minus next 15 days obligations
      const next15d = format(addDays(today, 15), 'yyyy-MM-dd');
      const obrigacoes15d = rawData.transactions
        .filter(t => t.tipo === 'PAGAR' && t.status === 'PREVISTO' && t.due_date >= todayStr && t.due_date <= next15d)
        .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

      const allPaidReceitas = rawData.transactions
        .filter(t => t.tipo === 'RECEBER' && t.status === 'PAGO')
        .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
      const allPaidDespesas = rawData.transactions
        .filter(t => t.tipo === 'PAGAR' && t.status === 'PAGO')
        .reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
      const saldoAtual = allPaidReceitas - allPaidDespesas;

      if (obrigacoes15d > saldoAtual) {
        alerts.push({
          tipo: 'risco',
          descricao: `Saldo insuficiente para cobrir R$ ${obrigacoes15d.toLocaleString('pt-BR')} em obrigações nos próximos 15 dias`,
          valor: obrigacoes15d - saldoAtual,
          id: 'risco-caixa',
        });
      }

      return alerts.sort((a, b) => {
        const order = { vencido: 0, risco: 1, vence_semana: 2 };
        return order[a.tipo] - order[b.tipo];
      });
    },
  });

  // Categories breakdown
  const categoriesBreakdown = useQuery({
    queryKey: ['analise-financeira-categories'],
    enabled: !!rawData,
    queryFn: () => {
      if (!rawData) return [];
      const catMap: Record<string, { name: string; color: string; receitas: number; despesas: number }> = {};

      rawData.transactions.forEach(t => {
        if (t.status === 'CANCELADO') return;
        const catId = t.category_id || 'sem-categoria';
        const cat = rawData.categories.find(c => c.id === catId);
        if (!catMap[catId]) {
          catMap[catId] = {
            name: cat?.name || 'Sem categoria',
            color: cat?.color || '#6b7280',
            receitas: 0,
            despesas: 0,
          };
        }
        const amount = Math.abs(Number(t.amount));
        if (t.tipo === 'RECEBER') catMap[catId].receitas += amount;
        else catMap[catId].despesas += amount;
      });

      return Object.entries(catMap)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => (b.despesas + b.receitas) - (a.despesas + a.receitas))
        .slice(0, 10);
    },
  });

  return {
    timelineData: timelineData.data || [],
    kpis: kpis.data || null,
    alertas: alertas.data || [],
    categoriesBreakdown: categoriesBreakdown.data || [],
    categories: rawData?.categories || [],
    isLoading: isLoading || timelineData.isLoading,
  };
}
