import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export interface FiscalMetrics {
  // Reconciliação
  totalBoletos: number;
  totalPedidos: number;
  boletosComNF: number;
  pedidosComNF: number;
  gapEntradas: number;
  gapSaidas: number;
  
  // DRE Fiscal
  receitaBruta: number;
  impostosSaida: number;
  custoMercadorias: number;
  impostosEntrada: number;
  
  // ICMS
  creditoICMS: number;
  debitoICMS: number;
  
  // Cobertura
  coberturaDocumental: number;
  totalPendencias: number;
  
  // Margem
  margemFiscal: number;
  
  // Fluxo diário
  fluxoDiario: {
    dia: string;
    entradas: number;
    saidas: number;
    saldo: number;
  }[];
  
  // Pendências detalhadas
  pendencias: {
    id: string;
    tipo: 'boleto_sem_nf' | 'pedido_sem_nf' | 'divergencia';
    referencia: string;
    valor: number;
    data: string;
    descricao: string;
    prioridade: 'alta' | 'media' | 'baixa';
  }[];
}

export function useFiscalMetrics(month: string) {
  return useQuery({
    queryKey: ['fiscal-metrics', month],
    queryFn: async (): Promise<FiscalMetrics> => {
      const startDate = startOfMonth(parseISO(month + '-01'));
      const endDate = endOfMonth(startDate);
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // 1. Buscar boletos pagos no mês
      const { data: boletos } = await supabase
        .from('boletos')
        .select('id, description, beneficiario, amount, paid_at, tipo_nota')
        .eq('status', 'PAGO')
        .gte('paid_at', startStr)
        .lte('paid_at', endStr + 'T23:59:59');

      // 2. Buscar pedidos entregues no mês
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, numero_pedido, valor_total, data_entrega, cliente:clientes(nome)')
        .eq('status', 'entregue')
        .gte('data_entrega', startStr)
        .lte('data_entrega', endStr + 'T23:59:59');

      // 3. Buscar documentos fiscais do mês
      const { data: documentos } = await supabase
        .from('documentos_fiscais')
        .select('*')
        .gte('data_competencia', startStr)
        .lte('data_competencia', endStr);

      // 4. Buscar alertas pendentes
      const { data: alertas } = await supabase
        .from('contabilidade_alertas')
        .select('*')
        .eq('status', 'PENDENTE');

      const boletosList = boletos || [];
      const pedidosList = pedidos || [];
      const docsList = documentos || [];
      const alertasList = alertas || [];

      // IDs com docs
      const boletoIdsComDoc = new Set(docsList.filter(d => d.boleto_id).map(d => d.boleto_id));
      const pedidoIdsComDoc = new Set(docsList.filter(d => d.pedido_id && d.direcao === 'SAIDA').map(d => d.pedido_id));

      // Totais
      const totalBoletos = boletosList.reduce((acc, b) => acc + Number(b.amount || 0), 0);
      const totalPedidos = pedidosList.reduce((acc, p) => acc + Number(p.valor_total || 0), 0);

      // Com NF
      const boletosComNFList = boletosList.filter(b => boletoIdsComDoc.has(b.id));
      const pedidosComNFList = pedidosList.filter(p => pedidoIdsComDoc.has(p.id));
      const boletosComNF = boletosComNFList.reduce((acc, b) => acc + Number(b.amount || 0), 0);
      const pedidosComNF = pedidosComNFList.reduce((acc, p) => acc + Number(p.valor_total || 0), 0);

      // Gaps
      const gapEntradas = totalBoletos - boletosComNF;
      const gapSaidas = totalPedidos - pedidosComNF;

      // Docs de entrada e saída (com status EMITIDA)
      const docsEntrada = docsList.filter(d => d.direcao === 'ENTRADA' && d.status === 'EMITIDA');
      const docsSaida = docsList.filter(d => d.direcao === 'SAIDA' && d.status === 'EMITIDA');

      // DRE Fiscal
      const receitaBruta = docsSaida.reduce((acc, d) => acc + Number(d.valor_total || 0), 0);
      const impostosSaida = docsSaida.reduce((acc, d) => 
        acc + Number(d.valor_icms || 0) + Number(d.valor_pis || 0) + Number(d.valor_cofins || 0) + Number(d.valor_iss || 0), 0);
      const custoMercadorias = docsEntrada.reduce((acc, d) => acc + Number(d.valor_total || 0), 0);
      const impostosEntrada = docsEntrada.reduce((acc, d) => 
        acc + Number(d.valor_icms || 0) + Number(d.valor_ipi || 0) + Number(d.valor_pis || 0) + Number(d.valor_cofins || 0), 0);

      // ICMS
      const creditoICMS = docsEntrada.reduce((acc, d) => acc + Number(d.valor_icms || 0), 0);
      const debitoICMS = docsSaida.reduce((acc, d) => acc + Number(d.valor_icms || 0), 0);

      // Cobertura
      const totalItens = boletosList.length + pedidosList.length;
      const itensComDoc = boletosComNFList.length + pedidosComNFList.length;
      const coberturaDocumental = totalItens > 0 ? (itensComDoc / totalItens) * 100 : 100;

      // Margem
      const lucroBruto = receitaBruta - impostosSaida - custoMercadorias;
      const margemFiscal = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;

      // Fluxo diário
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      const fluxoDiario = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayLabel = format(day, 'dd');
        
        const entradasDia = docsEntrada
          .filter(d => d.data_competencia === dayStr)
          .reduce((acc, d) => acc + Number(d.valor_total || 0), 0);
        
        const saidasDia = docsSaida
          .filter(d => d.data_competencia === dayStr)
          .reduce((acc, d) => acc + Number(d.valor_total || 0), 0);
        
        return {
          dia: dayLabel,
          entradas: entradasDia,
          saidas: saidasDia,
          saldo: saidasDia - entradasDia
        };
      });

      // Pendências detalhadas
      const pendencias: FiscalMetrics['pendencias'] = [];

      // Boletos sem NF
      boletosList
        .filter(b => !boletoIdsComDoc.has(b.id))
        .forEach(b => {
          pendencias.push({
            id: b.id,
            tipo: 'boleto_sem_nf',
            referencia: b.beneficiario || b.description || 'Boleto',
            valor: Number(b.amount || 0),
            data: b.paid_at || '',
            descricao: `Boleto pago sem NF de entrada: ${b.description || 'Sem descrição'}`,
            prioridade: Number(b.amount || 0) > 5000 ? 'alta' : Number(b.amount || 0) > 1000 ? 'media' : 'baixa'
          });
        });

      // Pedidos sem NF
      pedidosList
        .filter(p => !pedidoIdsComDoc.has(p.id))
        .forEach(p => {
          pendencias.push({
            id: p.id,
            tipo: 'pedido_sem_nf',
            referencia: `Pedido #${p.numero_pedido}`,
            valor: Number(p.valor_total || 0),
            data: p.data_entrega || '',
            descricao: `Pedido entregue sem NF de saída${p.cliente?.nome ? ` - ${p.cliente.nome}` : ''}`,
            prioridade: Number(p.valor_total || 0) > 5000 ? 'alta' : Number(p.valor_total || 0) > 1000 ? 'media' : 'baixa'
          });
        });

      // Alertas como divergências
      alertasList.forEach(a => {
        pendencias.push({
          id: a.id,
          tipo: 'divergencia',
          referencia: a.titulo,
          valor: Math.abs(Number(a.diferenca || 0)),
          data: a.created_at,
          descricao: a.descricao || 'Divergência fiscal detectada',
          prioridade: a.prioridade === 'ALTA' ? 'alta' : a.prioridade === 'MEDIA' ? 'media' : 'baixa'
        });
      });

      // Ordenar por prioridade e valor
      pendencias.sort((a, b) => {
        const prioridadeOrder = { alta: 0, media: 1, baixa: 2 };
        if (prioridadeOrder[a.prioridade] !== prioridadeOrder[b.prioridade]) {
          return prioridadeOrder[a.prioridade] - prioridadeOrder[b.prioridade];
        }
        return b.valor - a.valor;
      });

      return {
        totalBoletos,
        totalPedidos,
        boletosComNF,
        pedidosComNF,
        gapEntradas,
        gapSaidas,
        receitaBruta,
        impostosSaida,
        custoMercadorias,
        impostosEntrada,
        creditoICMS,
        debitoICMS,
        coberturaDocumental,
        totalPendencias: pendencias.length,
        margemFiscal,
        fluxoDiario,
        pendencias
      };
    }
  });
}
