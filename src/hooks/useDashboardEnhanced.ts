import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, addMonths, format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface EnhancedDashboardData {
  // Vendas
  vendas: {
    total: number;
    quantidade: number;
    crescimento: number;
    mesAnterior: number;
  };
  // Clientes
  clientes: {
    total: number;
    novos: number;
    crescimento: number;
    mesAnterior: number;
  };
  // Leads e Funil
  leads: {
    total: number;
    conversao: number;
    crescimento: number;
    byStatus: { status: string; count: number }[];
  };
  // Estoque
  estoque: {
    total: number;
    alertas: number;
    valor: number;
    produtosEmAlerta: { nome: string; estoque: number; minimo: number }[];
  };
  // Financeiro
  financeiro: {
    receitas: number;
    despesas: number;
    resultado: number;
    receitasCrescimento: number;
    despesasCrescimento: number;
    atrasadas: number;
    valorAtrasado: number;
    pendentes7dias: number;
    valorPendente: number;
    faturasAbertas: number;
    valorFaturas: number;
  };
  // WhatsApp
  whatsapp: {
    conversasAtivas: number;
    naoLidas: number;
    isConnected: boolean;
  };
  // Pedidos
  pedidos: {
    total: number;
    pendentes: number;
    emAndamento: number;
    valorPendente: number;
    byStatus: { status: string; count: number; valor: number }[];
  };
  // Rankings
  topClientes: { nome: string; valor: number }[];
  topProdutos: { nome: string; quantidade: number; valor: number }[];
  topCategoriasDespesa: { nome: string; valor: number }[];
}

export interface CashFlowForecast {
  data: string;
  receitas: number;
  despesas: number;
  saldo: number;
  acumulado: number;
}

export interface LeadFunnel {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

export function useDashboardEnhanced(mesReferencia: Date = new Date(), entityFilter: 'all' | 'LOJA' | 'PARTICULAR' = 'all') {
  const inicioMes = startOfMonth(mesReferencia);
  const fimMes = endOfMonth(mesReferencia);
  const mesAnterior = subMonths(mesReferencia, 1);
  const inicioMesAnterior = startOfMonth(mesAnterior);
  const fimMesAnterior = endOfMonth(mesAnterior);

  // Main dashboard data
  const { data: dashboardData, isLoading, refetch } = useQuery({
    queryKey: ['dashboard-enhanced', format(mesReferencia, 'yyyy-MM'), entityFilter],
    queryFn: async (): Promise<EnhancedDashboardData> => {
      const monthStr = format(mesReferencia, 'yyyy-MM');
      const prevMonthStr = format(mesAnterior, 'yyyy-MM');

      // Parallel fetches for performance
      const [
        vendasMes,
        vendasMesAnterior,
        clientesMes,
        clientesMesAnterior,
        totalClientesResult,
        leadsResult,
        produtosResult,
        transacoesMes,
        transacoesMesAnterior,
        atrasadasResult,
        pendentesResult,
        faturasResult,
        whatsappResult,
        pedidosResult,
        itensResult,
      ] = await Promise.all([
        // Vendas mês atual
        supabase.from('pedidos').select('valor_total').gte('data_pedido', inicioMes.toISOString()).lte('data_pedido', fimMes.toISOString()),
        // Vendas mês anterior
        supabase.from('pedidos').select('valor_total').gte('data_pedido', inicioMesAnterior.toISOString()).lte('data_pedido', fimMesAnterior.toISOString()),
        // Clientes mês atual
        supabase.from('clientes').select('id').gte('data_cadastro', inicioMes.toISOString()).lte('data_cadastro', fimMes.toISOString()),
        // Clientes mês anterior
        supabase.from('clientes').select('id').gte('data_cadastro', inicioMesAnterior.toISOString()).lte('data_cadastro', fimMesAnterior.toISOString()),
        // Total clientes
        supabase.from('clientes').select('*', { count: 'exact', head: true }),
        // Leads
        supabase.from('leads').select('id, status'),
        // Produtos
        supabase.from('produtos').select('id, nome, estoque, estoque_minimo, preco'),
        // Transações mês atual
        supabase.from('transactions').select('amount, tipo, category_id, categories(name)').like('due_date', `${monthStr}%`),
        // Transações mês anterior
        supabase.from('transactions').select('amount, tipo').like('due_date', `${prevMonthStr}%`),
        // Atrasadas
        supabase.from('transactions').select('amount').eq('status', 'PREVISTO').eq('tipo', 'PAGAR').lt('due_date', format(new Date(), 'yyyy-MM-dd')),
        // Pendentes 7 dias
        supabase.from('transactions').select('amount').eq('status', 'PREVISTO').eq('tipo', 'PAGAR').gte('due_date', format(new Date(), 'yyyy-MM-dd')).lte('due_date', format(addDays(new Date(), 7), 'yyyy-MM-dd')),
        // Faturas abertas
        supabase.from('credit_card_invoices').select('total_value').in('status', ['ABERTA', 'FECHADA']),
        // WhatsApp
        supabase.from('whatsapp_instances').select('id, status').limit(1),
        // Pedidos
        supabase.from('pedidos').select('id, status, valor_total'),
        // Itens pedidos para ranking
        supabase.from('pedido_itens').select('quantidade, subtotal, produtos(nome)').gte('created_at', inicioMes.toISOString()).lte('created_at', fimMes.toISOString()),
      ]);

      // Calculate vendas
      const totalVendas = vendasMes.data?.reduce((acc, p) => acc + Number(p.valor_total), 0) || 0;
      const totalVendasAnterior = vendasMesAnterior.data?.reduce((acc, p) => acc + Number(p.valor_total), 0) || 0;
      const crescimentoVendas = totalVendasAnterior > 0 ? ((totalVendas - totalVendasAnterior) / totalVendasAnterior) * 100 : 0;

      // Calculate clientes
      const novosClientes = clientesMes.data?.length || 0;
      const novosClientesAnterior = clientesMesAnterior.data?.length || 0;
      const crescimentoClientes = novosClientesAnterior > 0 ? ((novosClientes - novosClientesAnterior) / novosClientesAnterior) * 100 : 0;

      // Calculate leads funnel
      const leads = leadsResult.data || [];
      const leadsByStatus: Record<string, number> = {};
      leads.forEach(l => {
        leadsByStatus[l.status] = (leadsByStatus[l.status] || 0) + 1;
      });
      const leadsConvertidos = leadsByStatus['convertido'] || leadsByStatus['fechado'] || 0;
      const taxaConversao = leads.length > 0 ? (leadsConvertidos / leads.length) * 100 : 0;

      // Calculate estoque
      const produtos = produtosResult.data || [];
      const totalEstoque = produtos.reduce((acc, p) => acc + p.estoque, 0);
      const produtosEmAlerta = produtos.filter(p => p.estoque <= p.estoque_minimo);
      const valorEstoque = produtos.reduce((acc, p) => acc + (p.estoque * Number(p.preco)), 0);

      // Calculate financeiro
      const transacoes = transacoesMes.data || [];
      const transacoesAnterior = transacoesMesAnterior.data || [];
      
      const receitas = transacoes.filter(t => t.tipo === 'RECEBER').reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
      const despesas = transacoes.filter(t => t.tipo === 'PAGAR').reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
      
      const receitasAnterior = transacoesAnterior.filter(t => t.tipo === 'RECEBER').reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
      const despesasAnterior = transacoesAnterior.filter(t => t.tipo === 'PAGAR').reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);

      const receitasCrescimento = receitasAnterior > 0 ? ((receitas - receitasAnterior) / receitasAnterior) * 100 : 0;
      const despesasCrescimento = despesasAnterior > 0 ? ((despesas - despesasAnterior) / despesasAnterior) * 100 : 0;

      // Categories ranking
      const categoriasDespesa: Record<string, number> = {};
      transacoes.filter(t => t.tipo === 'PAGAR').forEach((t: any) => {
        const catName = t.categories?.name || 'Outros';
        categoriasDespesa[catName] = (categoriasDespesa[catName] || 0) + Math.abs(Number(t.amount));
      });

      // WhatsApp - using new whatsapp_instances table
      const isConnected = whatsappResult.data?.[0]?.status === 'connected' || false;
      const instanceId = whatsappResult.data?.[0]?.id;
      
      let conversasAtivas = 0;
      let naoLidas = 0;
      
      if (instanceId) {
        // Count unique conversations from whatsapp_messages
        const { data: messagesData } = await supabase
          .from('whatsapp_messages')
          .select('remote_jid')
          .eq('instance_id', instanceId);
        
        const uniqueJids = new Set(messagesData?.map(m => m.remote_jid) || []);
        conversasAtivas = uniqueJids.size;
        
        // For now, unread count is 0 since we don't track read status per conversation
        naoLidas = 0;
      }

      // Pedidos
      const pedidos = pedidosResult.data || [];
      const pedidosByStatus: Record<string, { count: number; valor: number }> = {};
      pedidos.forEach(p => {
        if (!pedidosByStatus[p.status]) {
          pedidosByStatus[p.status] = { count: 0, valor: 0 };
        }
        pedidosByStatus[p.status].count += 1;
        pedidosByStatus[p.status].valor += Number(p.valor_total);
      });

      const statusPendentes = ['pendente', 'aguardando', 'novo'];
      const statusEmAndamento = ['em_andamento', 'processando', 'separando'];
      const pedidosPendentes = pedidos.filter(p => statusPendentes.includes(p.status.toLowerCase()));
      const pedidosEmAndamento = pedidos.filter(p => statusEmAndamento.includes(p.status.toLowerCase()));

      // Top clientes
      const { data: topClientesData } = await supabase
        .from('pedidos')
        .select('cliente_id, valor_total, clientes(nome)')
        .gte('data_pedido', inicioMes.toISOString())
        .lte('data_pedido', fimMes.toISOString());

      const clientesRanking: Record<string, { nome: string; valor: number }> = {};
      topClientesData?.forEach((p: any) => {
        const id = p.cliente_id;
        if (!clientesRanking[id]) {
          clientesRanking[id] = { nome: p.clientes?.nome || 'Desconhecido', valor: 0 };
        }
        clientesRanking[id].valor += Number(p.valor_total);
      });

      // Top produtos
      const produtosRanking: Record<string, { nome: string; quantidade: number; valor: number }> = {};
      itensResult.data?.forEach((item: any) => {
        const nome = item.produtos?.nome || 'Produto';
        if (!produtosRanking[nome]) {
          produtosRanking[nome] = { nome, quantidade: 0, valor: 0 };
        }
        produtosRanking[nome].quantidade += item.quantidade;
        produtosRanking[nome].valor += Number(item.subtotal);
      });

      return {
        vendas: {
          total: totalVendas,
          quantidade: vendasMes.data?.length || 0,
          crescimento: crescimentoVendas,
          mesAnterior: totalVendasAnterior,
        },
        clientes: {
          total: totalClientesResult.count || 0,
          novos: novosClientes,
          crescimento: crescimentoClientes,
          mesAnterior: novosClientesAnterior,
        },
        leads: {
          total: leads.length,
          conversao: taxaConversao,
          crescimento: 0,
          byStatus: Object.entries(leadsByStatus).map(([status, count]) => ({ status, count })),
        },
        estoque: {
          total: totalEstoque,
          alertas: produtosEmAlerta.length,
          valor: valorEstoque,
          produtosEmAlerta: produtosEmAlerta.slice(0, 5).map(p => ({
            nome: p.nome,
            estoque: p.estoque,
            minimo: p.estoque_minimo,
          })),
        },
        financeiro: {
          receitas,
          despesas,
          resultado: receitas - despesas,
          receitasCrescimento,
          despesasCrescimento,
          atrasadas: atrasadasResult.data?.length || 0,
          valorAtrasado: atrasadasResult.data?.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0,
          pendentes7dias: pendentesResult.data?.length || 0,
          valorPendente: pendentesResult.data?.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0,
          faturasAbertas: faturasResult.data?.length || 0,
          valorFaturas: faturasResult.data?.reduce((acc, f) => acc + f.total_value, 0) || 0,
        },
        whatsapp: {
          conversasAtivas: conversasAtivas || 0,
          naoLidas,
          isConnected,
        },
        pedidos: {
          total: pedidos.length,
          pendentes: pedidosPendentes.length,
          emAndamento: pedidosEmAndamento.length,
          valorPendente: pedidosPendentes.reduce((acc, p) => acc + Number(p.valor_total), 0),
          byStatus: Object.entries(pedidosByStatus).map(([status, data]) => ({ status, ...data })),
        },
        topClientes: Object.values(clientesRanking).sort((a, b) => b.valor - a.valor).slice(0, 5),
        topProdutos: Object.values(produtosRanking).sort((a, b) => b.quantidade - a.quantidade).slice(0, 5),
        topCategoriasDespesa: Object.entries(categoriasDespesa)
          .map(([nome, valor]) => ({ nome, valor }))
          .sort((a, b) => b.valor - a.valor)
          .slice(0, 5),
      };
    },
  });

  // Cash flow forecast (next 90 days)
  const { data: cashFlowForecast } = useQuery({
    queryKey: ['cash-flow-forecast', format(mesReferencia, 'yyyy-MM')],
    queryFn: async (): Promise<CashFlowForecast[]> => {
      const today = new Date();
      const endDate = addMonths(today, 3);
      
      const { data: transactions } = await supabase
        .from('transactions')
        .select('amount, tipo, due_date, status')
        .gte('due_date', format(today, 'yyyy-MM-dd'))
        .lte('due_date', format(endDate, 'yyyy-MM-dd'))
        .order('due_date');

      const { data: cardTransactions } = await supabase
        .from('credit_card_invoices')
        .select('total_value, due_date')
        .gte('due_date', format(today, 'yyyy-MM-dd'))
        .lte('due_date', format(endDate, 'yyyy-MM-dd'));

      // Group by week
      const weeklyData: Record<string, { receitas: number; despesas: number }> = {};
      
      transactions?.forEach(t => {
        const weekKey = format(new Date(t.due_date), 'dd/MM');
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { receitas: 0, despesas: 0 };
        }
        const amount = Math.abs(Number(t.amount));
        if (t.tipo === 'RECEBER') {
          weeklyData[weekKey].receitas += amount;
        } else {
          weeklyData[weekKey].despesas += amount;
        }
      });

      cardTransactions?.forEach(ct => {
        const weekKey = format(new Date(ct.due_date!), 'dd/MM');
        if (!weeklyData[weekKey]) {
          weeklyData[weekKey] = { receitas: 0, despesas: 0 };
        }
        weeklyData[weekKey].despesas += ct.total_value;
      });

      let acumulado = 0;
      return Object.entries(weeklyData).map(([data, values]) => {
        const saldo = values.receitas - values.despesas;
        acumulado += saldo;
        return {
          data,
          receitas: values.receitas,
          despesas: values.despesas,
          saldo,
          acumulado,
        };
      });
    },
  });

  // Lead funnel data
  const { data: leadFunnel } = useQuery({
    queryKey: ['lead-funnel'],
    queryFn: async (): Promise<LeadFunnel[]> => {
      const { data: leads } = await supabase.from('leads').select('status');
      
      const statusOrder = ['novo_lead', 'qualificado', 'negociacao', 'proposta', 'fechado', 'convertido', 'perdido'];
      const statusColors: Record<string, string> = {
        'novo_lead': '#3b82f6',
        'qualificado': '#8b5cf6',
        'negociacao': '#f59e0b',
        'proposta': '#06b6d4',
        'fechado': '#10b981',
        'convertido': '#22c55e',
        'perdido': '#ef4444',
      };
      const statusLabels: Record<string, string> = {
        'novo_lead': 'Novo Lead',
        'qualificado': 'Qualificado',
        'negociacao': 'Negociação',
        'proposta': 'Proposta',
        'fechado': 'Fechado',
        'convertido': 'Convertido',
        'perdido': 'Perdido',
      };

      const counts: Record<string, number> = {};
      leads?.forEach(l => {
        counts[l.status] = (counts[l.status] || 0) + 1;
      });

      const total = leads?.length || 1;
      
      return statusOrder
        .filter(status => counts[status] > 0)
        .map(status => ({
          status: statusLabels[status] || status,
          count: counts[status],
          percentage: (counts[status] / total) * 100,
          color: statusColors[status] || '#6b7280',
        }));
    },
  });

  return {
    dashboardData,
    cashFlowForecast: cashFlowForecast || [],
    leadFunnel: leadFunnel || [],
    isLoading,
    refetch,
  };
}
