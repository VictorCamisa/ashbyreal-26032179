import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, eachDayOfInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';

export interface FiscalMetrics {
  // Entradas (Compras)
  totalEntradas: number;
  entradasComNF: number;
  entradasSemNF: number;
  
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

// ID do cliente "Faturamento Ashby" que não é cliente real
const ASHBY_FATURAMENTO_CLIENT_ID = '7baaaf6c-0d57-4381-af65-d7d01651c39f';

export function useFiscalMetrics(month: string) {
  return useQuery({
    queryKey: ['fiscal-metrics', month],
    queryFn: async (): Promise<FiscalMetrics> => {
      const startDate = startOfMonth(parseISO(month + '-01'));
      const endDate = endOfMonth(startDate);
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // 1. Buscar boletos pagos no mês (= ENTRADAS / compras)
      const { data: boletos } = await supabase
        .from('boletos')
        .select('id, description, beneficiario, amount, paid_at, tipo_nota')
        .eq('status', 'PAGO')
        .gte('paid_at', startStr)
        .lte('paid_at', endStr + 'T23:59:59');

      // 2. Buscar pedidos entregues no mês (= SAÍDAS / vendas) excluindo Faturamento Ashby
      const { data: pedidos } = await supabase
        .from('pedidos')
        .select('id, numero_pedido, valor_total, data_entrega, cliente_id, cliente:clientes(nome)')
        .eq('status', 'entregue')
        .neq('cliente_id', ASHBY_FATURAMENTO_CLIENT_ID)
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

      // ========== ENTRADAS (Compras) ==========
      // Classificação vem do campo tipo_nota do boleto
      const entradasComNF = boletosList
        .filter(b => b.tipo_nota === 'COM_NOTA')
        .reduce((acc, b) => acc + Number(b.amount || 0), 0);
      const entradasSemNF = boletosList
        .filter(b => b.tipo_nota !== 'COM_NOTA')
        .reduce((acc, b) => acc + Number(b.amount || 0), 0);
      const totalEntradas = entradasComNF + entradasSemNF;

      // ========== SAÍDAS (Vendas) ==========
      // Checar quais pedidos têm documento fiscal (NF-e ou NFC-e)
      const docsSaidaByPedido = new Map<string, string>(); // pedido_id -> tipo
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
      // Gap = Entradas com NF - Saídas com NF
      // Se positivo: compramos mais com NF do que vendemos com NF (crédito fiscal)
      // Se negativo: vendemos mais com NF do que compramos (situação ideal ou débito)
      const gapFiscal = entradasComNF - totalSaidasComNF;

      // Docs de entrada e saída (com status EMITIDA) para DRE
      const docsEntrada = docsList.filter(d => d.direcao === 'ENTRADA' && d.status === 'EMITIDA');
      const docsSaida = docsList.filter(d => d.direcao === 'SAIDA' && d.status === 'EMITIDA');

      // DRE Fiscal
      const receitaBruta = totalSaidas; // Receita real de vendas
      const impostosSaida = docsSaida.reduce((acc, d) => 
        acc + Number(d.valor_icms || 0) + Number(d.valor_pis || 0) + Number(d.valor_cofins || 0) + Number(d.valor_iss || 0), 0);
      const custoMercadorias = totalEntradas;
      const impostosEntrada = docsEntrada.reduce((acc, d) => 
        acc + Number(d.valor_icms || 0) + Number(d.valor_ipi || 0) + Number(d.valor_pis || 0) + Number(d.valor_cofins || 0), 0);

      // ICMS
      const creditoICMS = docsEntrada.reduce((acc, d) => acc + Number(d.valor_icms || 0), 0);
      const debitoICMS = docsSaida.reduce((acc, d) => acc + Number(d.valor_icms || 0), 0);

      // Cobertura documental
      const totalItens = boletosList.length + pedidosList.length;
      const boletosComDoc = boletosList.filter(b => b.tipo_nota === 'COM_NOTA').length;
      const pedidosComDoc = pedidosList.filter(p => docsSaidaByPedido.has(p.id)).length;
      const itensComDoc = boletosComDoc + pedidosComDoc;
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
        
        const entradasDia = boletosList
          .filter(b => b.paid_at && b.paid_at.startsWith(dayStr))
          .reduce((acc, b) => acc + Number(b.amount || 0), 0);
        
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
            data: b.paid_at || '',
            descricao: `Compra paga sem NF de entrada: ${b.description || 'Sem descrição'}`,
            prioridade: Number(b.amount || 0) > 5000 ? 'alta' : Number(b.amount || 0) > 1000 ? 'media' : 'baixa'
          });
        });

      // Pedidos sem NF
      pedidosList
        .filter(p => !docsSaidaByPedido.has(p.id))
        .forEach(p => {
          pendencias.push({
            id: p.id,
            tipo: 'pedido_sem_nf',
            referencia: `Pedido #${p.numero_pedido}`,
            valor: Number(p.valor_total || 0),
            data: p.data_entrega || '',
            descricao: `Venda entregue sem NF/Cupom${(p as any).cliente?.nome ? ` - ${(p as any).cliente.nome}` : ''}`,
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