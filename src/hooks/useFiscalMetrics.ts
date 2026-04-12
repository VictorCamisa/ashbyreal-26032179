import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export interface FiscalMetrics {
  // Entradas (Compras)
  totalEntradas: number;
  entradasComNF: number;
  entradasSemNF: number;
  entradasFrete: number;
  
  // Saídas (Vendas)
  totalSaidas: number;
  saidasComNFe: number;
  saidasComCupom: number;
  saidasSemNF: number;
  
  // Gap Fiscal = Entradas com NF - Saídas com NF
  gapFiscal: number;
  
  // Legacy compat
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

// ID do cliente "Faturamento Ashby" - compras do fornecedor
const ASHBY_FATURAMENTO_CLIENT_ID = '7baaaf6c-0d57-4381-af65-d7d01651c39f';

// Parse "Sem NF: R$3,254.90 | Com NF: R$3,809.69 | Frete: R$490.00" from observacoes
function parseAshbyObservacoes(obs: string | null): { comNF: number; semNF: number; frete: number } {
  if (!obs) return { comNF: 0, semNF: 0, frete: 0 };
  
  const parseValue = (label: string): number => {
    const regex = new RegExp(label + ':\\s*R\\$\\s*([\\d.,]+)', 'i');
    const match = obs.match(regex);
    if (!match) return 0;
    return parseFloat(match[1].replace(/\./g, '').replace(',', '.')) || 0;
  };
  
  return {
    comNF: parseValue('Com NF'),
    semNF: parseValue('Sem NF'),
    frete: parseValue('Frete'),
  };
}

async function fetchAllAshbyPedidos(startStr: string, endStr: string) {
  const all: any[] = [];
  let from = 0;
  const pageSize = 1000;
  
  while (true) {
    const { data, error } = await supabase
      .from('pedidos')
      .select('id, data_pedido, valor_total, observacoes')
      .eq('cliente_id', ASHBY_FATURAMENTO_CLIENT_ID)
      .gte('data_pedido', startStr)
      .lte('data_pedido', endStr + 'T23:59:59')
      .range(from, from + pageSize - 1);
    
    if (error) throw error;
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  
  return all;
}

export function useFiscalMetrics(month: string) {
  return useQuery({
    queryKey: ['fiscal-metrics', month],
    queryFn: async (): Promise<FiscalMetrics> => {
      const startDate = startOfMonth(parseISO(month + '-01'));
      const endDate = endOfMonth(startDate);
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // 1. Buscar TODOS os boletos do mês por due_date (= ENTRADAS)
      const { data: boletos } = await supabase
        .from('boletos')
        .select('id, description, beneficiario, amount, due_date, paid_at, tipo_nota, status')
        .neq('status', 'CANCELADO')
        .neq('status', 'REJEITADO')
        .gte('due_date', startStr)
        .lte('due_date', endStr);

      // 2. Buscar compras Ashby no mês (fallback histórico para meses sem boletos)
      const ashbyPedidos = await fetchAllAshbyPedidos(startStr, endStr);

      // 3. Buscar vendas (pedidos entregues) excluindo Ashby
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, numero_pedido, valor_total, data_entrega, data_pedido, cliente_id, cliente:clientes(nome)')
        .eq('status', 'entregue')
        .neq('cliente_id', ASHBY_FATURAMENTO_CLIENT_ID)
        .gte('data_entrega', startStr)
        .lte('data_entrega', endStr + 'T23:59:59');

      // 4. Buscar documentos fiscais do mês
      const { data: documentos } = await supabase
        .from('documentos_fiscais')
        .select('*')
        .gte('data_competencia', startStr)
        .lte('data_competencia', endStr);

      // 5. Buscar alertas pendentes
      const { data: alertas } = await supabase
        .from('contabilidade_alertas')
        .select('*')
        .eq('status', 'PENDENTE');

      const boletosList = boletos || [];
      const pedidosList = pedidos || [];
      const docsList = documentos || [];
      const alertasList = alertas || [];

      // ========== ENTRADAS (Compras) ==========
      // Fonte principal: Boletos (integração real com Financeiro)
      const boletosComNF = boletosList
        .filter(b => b.tipo_nota === 'COM_NOTA')
        .reduce((acc, b) => acc + Number(b.amount || 0), 0);
      const boletosSemNF = boletosList
        .filter(b => b.tipo_nota !== 'COM_NOTA')
        .reduce((acc, b) => acc + Number(b.amount || 0), 0);

      // Fonte histórica: Ashby (apenas quando não há boletos no mês)
      let ashbyComNF = 0;
      let ashbySemNF = 0;
      let ashbyFrete = 0;

      if (boletosList.length === 0 && ashbyPedidos.length > 0) {
        // Mês sem boletos → usar dados Ashby como fallback
        ashbyPedidos.forEach(p => {
          const parsed = parseAshbyObservacoes(p.observacoes);
          ashbyComNF += parsed.comNF;
          ashbySemNF += parsed.semNF;
          ashbyFrete += parsed.frete;
        });
      }

      // Totais de entrada
      const entradasComNF = boletosComNF + ashbyComNF;
      const entradasSemNF = boletosSemNF + ashbySemNF;
      const entradasFrete = ashbyFrete;
      const totalEntradas = entradasComNF + entradasSemNF + entradasFrete;

      // ========== SAÍDAS (Vendas) ==========
      const docsSaidaByPedido = new Map<string, string>();
      docsList
        .filter(d => d.pedido_id && d.direcao === 'SAIDA' && d.status === 'EMITIDA')
        .forEach(d => {
          if (d.pedido_id) docsSaidaByPedido.set(d.pedido_id, d.tipo);
        });

      let saidasComNFe = 0;
      let saidasComCupom = 0;
      let saidasSemNF = 0;

      pedidosList.forEach(p => {
        const valor = Number(p.valor_total || 0);
        const docTipo = docsSaidaByPedido.get(p.id);
        if (docTipo === 'NFE') {
          saidasComNFe += valor;
        } else if (docTipo === 'NFCE' || docTipo === 'CFE_SAT') {
          saidasComCupom += valor;
        } else {
          saidasSemNF += valor;
        }
      });

      const totalSaidas = saidasComNFe + saidasComCupom + saidasSemNF;
      const totalSaidasComNF = saidasComNFe + saidasComCupom;

      // ========== GAP FISCAL ==========
      const gapFiscal = entradasComNF - totalSaidasComNF;

      // Docs de entrada e saída (com status EMITIDA) para DRE
      const docsEntrada = docsList.filter(d => d.direcao === 'ENTRADA' && d.status === 'EMITIDA');
      const docsSaida = docsList.filter(d => d.direcao === 'SAIDA' && d.status === 'EMITIDA');

      // DRE Fiscal
      const receitaBruta = totalSaidas;
      const impostosSaida = docsSaida.reduce((acc, d) => 
        acc + Number(d.valor_icms || 0) + Number(d.valor_pis || 0) + Number(d.valor_cofins || 0) + Number(d.valor_iss || 0), 0);
      const custoMercadorias = totalEntradas;
      const impostosEntrada = docsEntrada.reduce((acc, d) => 
        acc + Number(d.valor_icms || 0) + Number(d.valor_ipi || 0) + Number(d.valor_pis || 0) + Number(d.valor_cofins || 0), 0);

      // ICMS
      const creditoICMS = docsEntrada.reduce((acc, d) => acc + Number(d.valor_icms || 0), 0);
      const debitoICMS = docsSaida.reduce((acc, d) => acc + Number(d.valor_icms || 0), 0);

      // Cobertura documental
      const boletosComNFCount = boletosList.filter(b => b.tipo_nota === 'COM_NOTA').length;
      const totalItensEntrada = boletosList.length > 0 ? boletosList.length : ashbyPedidos.length;
      const itensEntradaComNF = boletosList.length > 0 
        ? boletosComNFCount 
        : ashbyPedidos.filter(p => parseAshbyObservacoes(p.observacoes).comNF > 0).length;
      
      const totalItens = totalItensEntrada + pedidosList.length;
      const pedidosComDoc = pedidosList.filter(p => docsSaidaByPedido.has(p.id)).length;
      const itensComDoc = itensEntradaComNF + pedidosComDoc;
      const coberturaDocumental = totalItens > 0 ? (itensComDoc / totalItens) * 100 : 100;

      // Margem
      const lucroBruto = receitaBruta - impostosSaida - custoMercadorias;
      const margemFiscal = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;

      // Fluxo diário
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      let saldoAcumulado = 0;
      const fluxoDiario = days.map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayLabel = format(day, 'dd');
        
        // Entradas do dia: boletos (por due_date) + ashby fallback
        const boletosDia = boletosList
          .filter(b => b.due_date && b.due_date === dayStr)
          .reduce((acc, b) => acc + Number(b.amount || 0), 0);
        const ashbyDia = (boletosList.length === 0 && ashbyPedidos.length > 0)
          ? ashbyPedidos
              .filter(p => p.data_pedido && p.data_pedido.startsWith(dayStr))
              .reduce((acc, p) => acc + Number(p.valor_total || 0), 0)
          : 0;
        const entradasDia = boletosDia + ashbyDia;
        
        const saidasDia = pedidosList
          .filter(p => p.data_entrega && p.data_entrega.startsWith(dayStr))
          .reduce((acc, p) => acc + Number(p.valor_total || 0), 0);
        
        saldoAcumulado += saidasDia - entradasDia;
        
        return {
          dia: dayLabel,
          entradas: entradasDia,
          saidas: saidasDia,
          saldo: saldoAcumulado
        };
      });

      // Pendências detalhadas
      const pendencias: FiscalMetrics['pendencias'] = [];

      // Boletos sem NF
      boletosList
        .filter(b => b.tipo_nota !== 'COM_NOTA')
        .forEach(b => {
          pendencias.push({
            id: b.id,
            tipo: 'boleto_sem_nf',
            referencia: b.beneficiario || b.description || 'Boleto',
            valor: Number(b.amount || 0),
            data: b.due_date || '',
            descricao: `Compra sem NF: ${b.description || b.beneficiario || 'Sem descrição'} (${b.status})`,
            prioridade: Number(b.amount || 0) > 5000 ? 'alta' : Number(b.amount || 0) > 1000 ? 'media' : 'baixa'
          });
        });

      // Pedidos sem NF de saída
      pedidosList
        .filter(p => !docsSaidaByPedido.has(p.id))
        .forEach(p => {
          pendencias.push({
            id: p.id,
            tipo: 'pedido_sem_nf',
            referencia: `Pedido #${p.numero_pedido}`,
            valor: Number(p.valor_total || 0),
            data: p.data_entrega || '',
            descricao: `Venda sem NF/Cupom${(p as any).cliente?.nome ? ` - ${(p as any).cliente.nome}` : ''}`,
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

      pendencias.sort((a, b) => {
        const prioridadeOrder = { alta: 0, media: 1, baixa: 2 };
        if (prioridadeOrder[a.prioridade] !== prioridadeOrder[b.prioridade]) {
          return prioridadeOrder[a.prioridade] - prioridadeOrder[b.prioridade];
        }
        return b.valor - a.valor;
      });

      return {
        totalEntradas,
        entradasComNF,
        entradasSemNF,
        entradasFrete,
        totalSaidas,
        saidasComNFe,
        saidasComCupom,
        saidasSemNF,
        gapFiscal,
        // Legacy compat
        totalBoletos: totalEntradas,
        totalPedidos: totalSaidas,
        boletosComNF: entradasComNF,
        pedidosComNF: totalSaidasComNF,
        gapEntradas: entradasSemNF,
        gapSaidas: saidasSemNF,
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