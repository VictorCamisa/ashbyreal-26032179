import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getLojistaClienteMatches } from '@/lib/lojistaMatching';

const PEDIDOS_BATCH_SIZE = 1000;
const CLIENTES_BATCH_SIZE = 1000;

type DashboardPedido = {
  id: string;
  cliente_id: string | null;
  lojista_id: string | null;
  status: string | null;
  valor_total: number | null;
  data_pedido: string | null;
};

async function fetchPedidosDesde2023() {
  const pedidos: DashboardPedido[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, cliente_id, lojista_id, status, valor_total, data_pedido')
      .gte('data_pedido', '2023-01-01T00:00:00')
      .order('data_pedido', { ascending: false })
      .range(from, from + PEDIDOS_BATCH_SIZE - 1);

    if (error) throw error;

    const batch = data || [];
    pedidos.push(...batch);

    if (batch.length < PEDIDOS_BATCH_SIZE) break;
    from += PEDIDOS_BATCH_SIZE;
  }

  return pedidos.filter((pedido) => pedido.status !== 'cancelado');
}

async function fetchClientes() {
  const clientes = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nome, empresa, telefone, cpf_cnpj')
      .order('id')
      .range(from, from + CLIENTES_BATCH_SIZE - 1);

    if (error) throw error;

    const batch = data || [];
    clientes.push(...batch);

    if (batch.length < CLIENTES_BATCH_SIZE) break;
    from += CLIENTES_BATCH_SIZE;
  }

  return clientes;
}

export interface LojistaDashboardItem {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  telefone: string;
  email: string | null;
  cnpj: string | null;
  status: string;
  contato_responsavel: string | null;
  observacoes: string | null;
  // Computed
  cliente_id: string | null;
  barris_count: number;
  barris_cheios: number;
  pedidos_pendentes: number;
  faturamento_total: number;
  faturamento_mes: number;
  total_pedidos: number;
  ultimo_pedido: string | null;
}

export interface LojistasKPIs {
  ativos: number;
  faturamentoMes: number;
  pedidosPendentes: number;
  barrisEmCampo: number;
}

export function useLojistaDashboard() {
  return useQuery({
    queryKey: ['lojista-dashboard'],
    queryFn: async () => {
      const [lojistasResult, clientesResult, barrisResult, pedidos] = await Promise.all([
        supabase.from('lojistas').select('*').order('nome'),
        fetchClientes(),
        supabase.from('barris').select('id, lojista_id, status_conteudo, localizacao'),
        fetchPedidosDesde2023(),
      ]);

      const { data: lojistas, error: lojError } = lojistasResult;

      if (lojError) throw lojError;

      if (barrisResult.error) throw barrisResult.error;

      const clientes = clientesResult || [];
      const barris = barrisResult.data || [];
      const clienteIdsByLojista = getLojistaClienteMatches(lojistas || [], clientes);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const items: LojistaDashboardItem[] = (lojistas || []).map(l => {
        const linkedClienteIds = clienteIdsByLojista[l.id] || [];
        const linkedClienteSet = new Set(linkedClienteIds);
        const clienteId = linkedClienteIds[0] || null;
        const lojistaBarris = barris.filter(b => b.lojista_id === l.id);
        const lojistaPedidos = pedidos.filter(p => 
          p.lojista_id === l.id || (!!p.cliente_id && linkedClienteSet.has(p.cliente_id))
        );
        const ultimoPedido = lojistaPedidos.reduce<string | null>((latest, pedido) => {
          if (!pedido.data_pedido) return latest;
          if (!latest) return pedido.data_pedido;
          return new Date(pedido.data_pedido).getTime() > new Date(latest).getTime() ? pedido.data_pedido : latest;
        }, null);

        return {
          id: l.id,
          nome: l.nome,
          nome_fantasia: l.nome_fantasia,
          telefone: l.telefone,
          email: l.email,
          cnpj: l.cnpj,
          status: l.status,
          contato_responsavel: l.contato_responsavel,
          observacoes: l.observacoes,
          cliente_id: clienteId,
          barris_count: lojistaBarris.length,
          barris_cheios: lojistaBarris.filter(b => b.status_conteudo === 'CHEIO').length,
          pedidos_pendentes: lojistaPedidos.filter(p => p.status === 'pendente').length,
          faturamento_total: lojistaPedidos.reduce((acc, p) => acc + Number(p.valor_total || 0), 0),
          faturamento_mes: lojistaPedidos
            .filter(p => p.data_pedido && p.data_pedido >= monthStart)
            .reduce((acc, p) => acc + Number(p.valor_total || 0), 0),
          total_pedidos: lojistaPedidos.length,
          ultimo_pedido: ultimoPedido,
        };
      });

      items.sort((a, b) => b.faturamento_total - a.faturamento_total);

      const kpis: LojistasKPIs = {
        ativos: items.filter(l => l.status === 'ativo').length,
        faturamentoMes: items.reduce((acc, l) => acc + l.faturamento_mes, 0),
        pedidosPendentes: items.reduce((acc, l) => acc + l.pedidos_pendentes, 0),
        barrisEmCampo: barris.filter(b => b.localizacao === 'CLIENTE').length,
      };

      return { items, kpis };
    },
  });
}
