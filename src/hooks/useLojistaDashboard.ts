import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
      // Fetch lojistas
      const { data: lojistas, error: lojError } = await supabase
        .from('lojistas')
        .select('*')
        .order('nome');

      if (lojError) throw lojError;

      // Fetch matching clientes by name (legacy orders use cliente_id, not lojista_id)
      const { data: clientes } = await supabase
        .from('clientes')
        .select('id, nome');

      // Build name->cliente_id map (case-insensitive)
      const clienteMap: Record<string, string> = {};
      clientes?.forEach(c => {
        clienteMap[c.nome.toUpperCase()] = c.id;
      });

      // Fetch all barris with lojista_id
      const { data: barris } = await supabase
        .from('barris')
        .select('id, lojista_id, status_conteudo, localizacao');

      // Collect all relevant cliente_ids (matched by name) + lojista_ids
      const matchedClienteIds = (lojistas || [])
        .map(l => clienteMap[l.nome.toUpperCase()])
        .filter(Boolean);
      
      let pedidos: any[] = [];
      if (matchedClienteIds.length > 0) {
        const { data: pedidosData } = await supabase
          .from('pedidos')
          .select('id, cliente_id, lojista_id, status, valor_total, data_pedido')
          .in('cliente_id', matchedClienteIds)
          .neq('status', 'cancelado');
        pedidos = pedidosData || [];
      }

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      // Build enriched lojista list
      const items: LojistaDashboardItem[] = (lojistas || []).map(l => {
        const clienteId = clienteMap[l.nome.toUpperCase()] || null;
        const lojistaBarris = (barris || []).filter(b => b.lojista_id === l.id);
        // Match pedidos by lojista_id OR by linked cliente_id (legacy)
        const lojistaPedidos = pedidos.filter(p => 
          p.lojista_id === l.id || (clienteId && p.cliente_id === clienteId)
        );

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
            .filter(p => p.data_pedido >= monthStart)
            .reduce((acc, p) => acc + Number(p.valor_total || 0), 0),
          total_pedidos: lojistaPedidos.length,
          ultimo_pedido: lojistaPedidos.length > 0
            ? lojistaPedidos.sort((a, b) => new Date(b.data_pedido).getTime() - new Date(a.data_pedido).getTime())[0].data_pedido
            : null,
        };
      });

      // Sort by faturamento_total desc (most valuable first)
      items.sort((a, b) => b.faturamento_total - a.faturamento_total);

      const kpis: LojistasKPIs = {
        ativos: items.filter(l => l.status === 'ativo').length,
        faturamentoMes: items.reduce((acc, l) => acc + l.faturamento_mes, 0),
        pedidosPendentes: items.reduce((acc, l) => acc + l.pedidos_pendentes, 0),
        barrisEmCampo: (barris || []).filter(b => b.localizacao === 'CLIENTE').length,
      };

      return { items, kpis };
    },
  });
}
