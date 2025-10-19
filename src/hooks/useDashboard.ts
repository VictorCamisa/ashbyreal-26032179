import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, subMonths, format } from 'date-fns';

export interface DashboardData {
  vendas: {
    total: number;
    quantidade: number;
    crescimento: number;
  };
  clientes: {
    total: number;
    novos: number;
    crescimento: number;
  };
  leads: {
    total: number;
    conversao: number;
    crescimento: number;
  };
  estoque: {
    total: number;
    alertas: number;
    valor: number;
  };
  campanhas: {
    total: number;
    taxaResposta: number;
  };
}

export interface VendasPorDia {
  data: string;
  valor: number;
  quantidade: number;
}

export interface ProdutoMaisVendido {
  nome: string;
  quantidade: number;
  valor: number;
}

export interface LeadPorOrigem {
  origem: string;
  total: number;
}

export function useDashboard(mesReferencia: Date = new Date()) {
  const inicioMes = startOfMonth(mesReferencia);
  const fimMes = endOfMonth(mesReferencia);
  const mesAnterior = subMonths(mesReferencia, 1);
  const inicioMesAnterior = startOfMonth(mesAnterior);
  const fimMesAnterior = endOfMonth(mesAnterior);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard', format(mesReferencia, 'yyyy-MM')],
    queryFn: async () => {
      // Vendas do mês atual
      const { data: vendasMes } = await supabase
        .from('pedidos')
        .select('valor_total')
        .gte('data_pedido', inicioMes.toISOString())
        .lte('data_pedido', fimMes.toISOString());

      // Vendas do mês anterior
      const { data: vendasMesAnterior } = await supabase
        .from('pedidos')
        .select('valor_total')
        .gte('data_pedido', inicioMesAnterior.toISOString())
        .lte('data_pedido', fimMesAnterior.toISOString());

      const totalVendas = vendasMes?.reduce((acc, p) => acc + Number(p.valor_total), 0) || 0;
      const totalVendasAnterior = vendasMesAnterior?.reduce((acc, p) => acc + Number(p.valor_total), 0) || 0;
      const crescimentoVendas = totalVendasAnterior > 0 
        ? ((totalVendas - totalVendasAnterior) / totalVendasAnterior) * 100 
        : 0;

      // Clientes
      const { data: clientesMes } = await supabase
        .from('clientes')
        .select('id')
        .gte('data_cadastro', inicioMes.toISOString())
        .lte('data_cadastro', fimMes.toISOString());

      const { data: clientesMesAnterior } = await supabase
        .from('clientes')
        .select('id')
        .gte('data_cadastro', inicioMesAnterior.toISOString())
        .lte('data_cadastro', fimMesAnterior.toISOString());

      const { count: totalClientes } = await supabase
        .from('clientes')
        .select('*', { count: 'exact', head: true });

      const novosClientes = clientesMes?.length || 0;
      const crescimentoClientes = (clientesMesAnterior?.length || 0) > 0
        ? ((novosClientes - (clientesMesAnterior?.length || 0)) / (clientesMesAnterior?.length || 0)) * 100
        : 0;

      // Leads
      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });

      const { data: leadsConvertidos } = await supabase
        .from('leads')
        .select('id')
        .eq('status', 'convertido');

      const taxaConversao = totalLeads && totalLeads > 0
        ? ((leadsConvertidos?.length || 0) / totalLeads) * 100
        : 0;

      // Estoque
      const { data: produtos } = await supabase
        .from('produtos')
        .select('estoque, estoque_minimo, preco');

      const totalEstoque = produtos?.reduce((acc, p) => acc + p.estoque, 0) || 0;
      const alertasEstoque = produtos?.filter(p => p.estoque <= p.estoque_minimo).length || 0;
      const valorEstoque = produtos?.reduce((acc, p) => acc + (p.estoque * Number(p.preco)), 0) || 0;

      // Campanhas
      const { count: totalCampanhas } = await supabase
        .from('campanhas')
        .select('*', { count: 'exact', head: true });

      const { data: campanhas } = await supabase
        .from('campanhas')
        .select('mensagens_enviadas, respostas');

      const totalMensagens = campanhas?.reduce((acc, c) => acc + (c.mensagens_enviadas || 0), 0) || 0;
      const totalRespostas = campanhas?.reduce((acc, c) => acc + (c.respostas || 0), 0) || 0;
      const taxaResposta = totalMensagens > 0 ? (totalRespostas / totalMensagens) * 100 : 0;

      return {
        vendas: {
          total: totalVendas,
          quantidade: vendasMes?.length || 0,
          crescimento: crescimentoVendas,
        },
        clientes: {
          total: totalClientes || 0,
          novos: novosClientes,
          crescimento: crescimentoClientes,
        },
        leads: {
          total: totalLeads || 0,
          conversao: taxaConversao,
          crescimento: 0,
        },
        estoque: {
          total: totalEstoque,
          alertas: alertasEstoque,
          valor: valorEstoque,
        },
        campanhas: {
          total: totalCampanhas || 0,
          taxaResposta,
        },
      } as DashboardData;
    },
  });

  const { data: vendasPorDia } = useQuery({
    queryKey: ['vendas-por-dia', format(mesReferencia, 'yyyy-MM')],
    queryFn: async () => {
      const { data } = await supabase
        .from('pedidos')
        .select('data_pedido, valor_total')
        .gte('data_pedido', inicioMes.toISOString())
        .lte('data_pedido', fimMes.toISOString())
        .order('data_pedido', { ascending: true });

      const vendaAgrupada: Record<string, { valor: number; quantidade: number }> = {};

      data?.forEach((pedido) => {
        const dia = format(new Date(pedido.data_pedido), 'dd/MM');
        if (!vendaAgrupada[dia]) {
          vendaAgrupada[dia] = { valor: 0, quantidade: 0 };
        }
        vendaAgrupada[dia].valor += Number(pedido.valor_total);
        vendaAgrupada[dia].quantidade += 1;
      });

      return Object.entries(vendaAgrupada).map(([data, info]) => ({
        data,
        valor: info.valor,
        quantidade: info.quantidade,
      })) as VendasPorDia[];
    },
  });

  const { data: produtosMaisVendidos } = useQuery({
    queryKey: ['produtos-mais-vendidos', format(mesReferencia, 'yyyy-MM')],
    queryFn: async () => {
      const { data: itens } = await supabase
        .from('pedido_itens')
        .select('produto_id, quantidade, subtotal, produtos(nome)')
        .gte('created_at', inicioMes.toISOString())
        .lte('created_at', fimMes.toISOString());

      const produtosAgrupados: Record<string, { nome: string; quantidade: number; valor: number }> = {};

      itens?.forEach((item: any) => {
        const produtoId = item.produto_id;
        const nome = item.produtos?.nome || 'Produto desconhecido';
        
        if (!produtosAgrupados[produtoId]) {
          produtosAgrupados[produtoId] = { nome, quantidade: 0, valor: 0 };
        }
        produtosAgrupados[produtoId].quantidade += item.quantidade;
        produtosAgrupados[produtoId].valor += Number(item.subtotal);
      });

      return Object.values(produtosAgrupados)
        .sort((a, b) => b.quantidade - a.quantidade)
        .slice(0, 5) as ProdutoMaisVendido[];
    },
  });

  const { data: leadsPorOrigem } = useQuery({
    queryKey: ['leads-por-origem'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leads')
        .select('origem');

      const origemAgrupada: Record<string, number> = {};

      data?.forEach((lead) => {
        const origem = lead.origem || 'Não informado';
        origemAgrupada[origem] = (origemAgrupada[origem] || 0) + 1;
      });

      return Object.entries(origemAgrupada).map(([origem, total]) => ({
        origem,
        total,
      })) as LeadPorOrigem[];
    },
  });

  return {
    dashboardData,
    vendasPorDia,
    produtosMaisVendidos,
    leadsPorOrigem,
    isLoading,
  };
}
