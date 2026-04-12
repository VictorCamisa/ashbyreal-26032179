import { NavLink } from 'react-router-dom';
import { useMemo, useState } from 'react';
import {
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
  Calculator,
  Target,
  ArrowUpRight,
  Package,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Users,
  Droplets,
  BarChart3,
  Gauge,
  Receipt,
  MessageSquare,
  Boxes,
  Bot,
  Calendar,
  Store,
} from 'lucide-react';
import { UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUserModules } from '@/hooks/useAdminUsers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfQuarter, endOfQuarter, subWeeks, subMonths, subQuarters, format, isWithinInterval, isPast, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

type PeriodType = 'semana' | 'mes' | 'trimestre';

interface QuarterSelection {
  year: number;
  quarter: number; // 1-4
}

const METAS: Record<PeriodType, number> = {
  semana: 15000,
  mes: 60000,
  trimestre: 180000,
};

interface ModuleItem {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const modules: ModuleItem[] = [
  { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart, description: 'Vendas e entregas' },
  { key: 'crm', label: 'CRM', href: '/crm', icon: Target, description: 'Pipeline e leads' },
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet, description: 'Contas e caixa' },
  { key: 'contabilidade', label: 'Contabilidade', href: '/contabilidade', icon: Calculator, description: 'NFs e DRE' },
  { key: 'estoque', label: 'Estoque', href: '/estoque', icon: Boxes, description: 'Produtos e controle' },
  { key: 'clientes', label: 'Clientes', href: '/clientes', icon: Users, description: 'Base de clientes' },
  { key: 'lojistas', label: 'Lojistas', href: '/lojistas', icon: Store, description: 'Parceiros B2B' },
  { key: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageSquare, description: 'Conversas' },
  { key: 'agente-ia', label: 'Agente IA', href: '/agente-ia', icon: Bot, description: 'Automação' },
];

function getDateRanges(period: PeriodType, now: Date) {
  switch (period) {
    case 'semana': {
      const start = startOfWeek(now, { weekStartsOn: 1 });
      const end = endOfWeek(now, { weekStartsOn: 1 });
      const prevStart = subWeeks(start, 1);
      const prevEnd = subWeeks(end, 1);
      return { start, end, prevStart, prevEnd };
    }
    case 'mes': {
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const prevStart = startOfMonth(subMonths(now, 1));
      const prevEnd = endOfMonth(subMonths(now, 1));
      return { start, end, prevStart, prevEnd };
    }
    case 'trimestre': {
      const start = startOfQuarter(now);
      const end = endOfQuarter(now);
      const prevStart = startOfQuarter(subQuarters(now, 1));
      const prevEnd = endOfQuarter(subQuarters(now, 1));
      return { start, end, prevStart, prevEnd };
    }
  }
}

function getPeriodLabel(period: PeriodType, start: Date, end: Date) {
  switch (period) {
    case 'semana':
      return `${format(start, "dd/MM", { locale: ptBR })} — ${format(end, "dd/MM", { locale: ptBR })}`;
    case 'mes':
      return format(start, "MMMM yyyy", { locale: ptBR });
    case 'trimestre':
      return `${format(start, "MMM", { locale: ptBR })} — ${format(end, "MMM yyyy", { locale: ptBR })}`;
  }
}

function getComparisonLabel(period: PeriodType) {
  switch (period) {
    case 'semana': return 'vs sem. anterior';
    case 'mes': return 'vs mês anterior';
    case 'trimestre': return 'vs trim. anterior';
  }
}

export default function Hub() {
  const { user, signOut } = useAuth();
  const { data: visibleModules } = useUserModules();
  const [period, setPeriod] = useState<PeriodType>('trimestre');
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterSelection | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['hub-dashboard-all'],
    queryFn: async () => {
      const BATCH = 1000;

      async function fetchAllPedidos() {
        const all: any[] = [];
        let from = 0;

        while (true) {
          const { data: batch, error } = await supabase
            .from('pedidos')
            .select('id, cliente_id, status, valor_total, data_pedido, numero_pedido, metodo_pagamento, observacoes')
            .gte('data_pedido', '2023-01-01T00:00:00')
            .order('data_pedido', { ascending: false })
            .range(from, from + BATCH - 1);

          if (error) throw error;

          all.push(...(batch || []));
          if (!batch || batch.length < BATCH) break;
          from += BATCH;
        }

        return all;
      }

      async function fetchAllPedidoItens() {
        const all: any[] = [];
        let from = 0;

        while (true) {
          const { data: batch, error } = await supabase
            .from('pedido_itens')
            .select('pedido_id, quantidade, produtos(capacidade_barril, nome)')
            .range(from, from + BATCH - 1);

          if (error) throw error;

          all.push(...(batch || []));
          if (!batch || batch.length < BATCH) break;
          from += BATCH;
        }

        return all;
      }

      const [
        allPedidos,
        allPedidoItens,
        transacoesResult,
        clientesResult,
        estoqueResult,
        whatsappResult,
      ] = await Promise.all([
        fetchAllPedidos(),
        fetchAllPedidoItens(),
        supabase
          .from('transactions')
          .select('id, description, amount, tipo, status, due_date')
          .neq('status', 'CANCELADO')
          .order('due_date'),
        supabase.from('clientes').select('id, nome'),
        supabase.from('produtos').select('id, nome, estoque, estoque_minimo, estoque_litros').filter('ativo', 'eq', true),
        supabase.from('whatsapp_instances').select('id, status').limit(1),
      ]);

      return {
        allPedidos,
        allPedidoItens,
        transacoes: transacoesResult.data || [],
        clientes: clientesResult.data || [],
        produtos: estoqueResult.data || [],
        whatsapp: whatsappResult.data?.[0] || null,
      };
    },
  });

  const filteredModules = useMemo(() => {
    if (!visibleModules) return modules;
    return modules.filter((m) => visibleModules.includes(m.key));
  }, [visibleModules]);

  const referenceDate = useMemo(() => {
    if (selectedQuarter) {
      // Use the selected quarter's midpoint as reference
      return new Date(selectedQuarter.year, (selectedQuarter.quarter - 1) * 3 + 1, 15);
    }
    const latestPedido = data?.allPedidos?.find((pedido: any) => Boolean(pedido.data_pedido));
    return latestPedido?.data_pedido ? new Date(latestPedido.data_pedido) : new Date();
  }, [data?.allPedidos, selectedQuarter]);

  // Auto-select current quarter on first load
  useMemo(() => {
    if (!selectedQuarter && data?.allPedidos?.length) {
      const latestPedido = data.allPedidos.find((p: any) => Boolean(p.data_pedido));
      const refDate = latestPedido?.data_pedido ? new Date(latestPedido.data_pedido) : new Date();
      setSelectedQuarter({ year: refDate.getFullYear(), quarter: Math.floor(refDate.getMonth() / 3) + 1 });
    }
  }, [data?.allPedidos]);

  const now = referenceDate;
  const { start: rangeStart, end: rangeEnd, prevStart, prevEnd } = useMemo(
    () => getDateRanges(period, referenceDate),
    [period, referenceDate]
  );

  const weekStart = useMemo(() => startOfWeek(referenceDate, { weekStartsOn: 1 }), [referenceDate]);
  const weekEnd = useMemo(() => endOfWeek(referenceDate, { weekStartsOn: 1 }), [referenceDate]);

  const clientesMapObj = useMemo(() => {
    const map: Record<string, string> = {};
    data?.clientes?.forEach((c) => {
      map[c.id] = c.nome;
    });
    return map;
  }, [data?.clientes]);

  const pedidos = useMemo(() => {
    return (data?.allPedidos || []).filter((p: any) => {
      if (!p.data_pedido) return false;
      const pedidoDate = new Date(p.data_pedido);
      return pedidoDate >= rangeStart && pedidoDate <= rangeEnd;
    });
  }, [data?.allPedidos, rangeStart, rangeEnd]);

  const pedidosAnterior = useMemo(() => {
    return (data?.allPedidos || []).filter((p: any) => {
      if (!p.data_pedido) return false;
      const pedidoDate = new Date(p.data_pedido);
      return pedidoDate >= prevStart && pedidoDate <= prevEnd;
    });
  }, [data?.allPedidos, prevStart, prevEnd]);

  const transacoes = useMemo(() => {
    const start = format(rangeStart, 'yyyy-MM-dd');
    const end = format(rangeEnd, 'yyyy-MM-dd');

    return (data?.transacoes || []).filter((t: any) => {
      return t.due_date && t.due_date >= start && t.due_date <= end;
    });
  }, [data?.transacoes, rangeStart, rangeEnd]);

  const litrosPorPedido = useMemo(() => {
    const map: Record<string, number> = {};

    (data?.allPedidoItens || []).forEach((item: any) => {
      const capacidadeBarril = Number(item.produtos?.capacidade_barril || 0);
      const quantidade = Number(item.quantidade || 0);

      if (!item.pedido_id || capacidadeBarril <= 0 || quantidade <= 0) return;
      map[item.pedido_id] = (map[item.pedido_id] || 0) + capacidadeBarril * quantidade;
    });

    return map;
  }, [data?.allPedidoItens]);

  const extrairLitros = (pedido: any) => {
    const litrosItens = litrosPorPedido[pedido.id] || 0;
    if (litrosItens > 0) return litrosItens;

    const observacoes = String(pedido.observacoes || '');
    const matches = observacoes.match(/(\d+(?:[\.,]\d+)?)\s*l(?:itros)?/gi);
    if (!matches) return 0;

    return matches.reduce((sum, match) => {
      const value = Number(match.replace(/[^\d,\.]/g, '').replace(',', '.'));
      return Number.isFinite(value) ? sum + value : sum;
    }, 0);
  };

  const pedidosAtivos = pedidos.filter((p) => p.status !== 'cancelado');
  const pedidosAnteriorAtivos = pedidosAnterior.filter((p: any) => p.status !== 'cancelado');
  const faturamento = pedidosAtivos.reduce((a, p) => a + Number(p.valor_total || 0), 0);
  const faturamentoAnterior = pedidosAnteriorAtivos.reduce((a: number, p: any) => a + Number(p.valor_total || 0), 0);
  const meta = METAS[period];
  const metaProgress = meta > 0 ? Math.min((faturamento / meta) * 100, 100) : 0;
  const faltaMeta = Math.max(meta - faturamento, 0);

  const clientesAtivos = new Set(pedidosAtivos.map((p) => p.cliente_id).filter(Boolean)).size;
  const clientesAtivosAnterior = new Set(pedidosAnteriorAtivos.map((p: any) => p.cliente_id).filter(Boolean)).size;
  const clientesTrend = clientesAtivosAnterior > 0 ? ((clientesAtivos - clientesAtivosAnterior) / clientesAtivosAnterior) * 100 : 0;

  const ticketMedio = pedidosAtivos.length > 0 ? faturamento / pedidosAtivos.length : 0;
  const ticketMedioAnterior = pedidosAnteriorAtivos.length > 0 ? faturamentoAnterior / pedidosAnteriorAtivos.length : 0;
  const ticketTrend = ticketMedioAnterior > 0 ? ((ticketMedio - ticketMedioAnterior) / ticketMedioAnterior) * 100 : 0;

  const litrosPeriodo = useMemo(() => {
    return pedidosAtivos.reduce((acc, pedido: any) => acc + extrairLitros(pedido), 0);
  }, [pedidosAtivos, litrosPorPedido]);

  const litrosAnterior = useMemo(() => {
    return pedidosAnteriorAtivos.reduce((acc, pedido: any) => acc + extrairLitros(pedido), 0);
  }, [pedidosAnteriorAtivos, litrosPorPedido]);

  const litrosTrend = litrosAnterior > 0 ? ((litrosPeriodo - litrosAnterior) / litrosAnterior) * 100 : 0;

  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pedidos.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [pedidos]);

  const pedidosPendentes = statusCounts['pendente'] || 0;
  const pedidosPagos = (statusCounts['pago'] || 0) + (statusCounts['entregue'] || 0);

  // Financial
  const contasAPagar = transacoes.filter(t => t.tipo === 'PAGAR' && t.status !== 'PAGO');
  const contasAReceber = transacoes.filter(t => t.tipo === 'RECEBER' && t.status !== 'PAGO');
  const totalPagar = contasAPagar.reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
  const totalReceber = contasAReceber.reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

  // Estoque alerts
  const produtosAlerta = (data?.produtos || []).filter(p => p.estoque <= p.estoque_minimo);

  // Timeline (week only)
  const wednesday = new Date(weekStart);
  wednesday.setDate(wednesday.getDate() + 2);
  wednesday.setHours(23, 59, 59);
  const deadlinePassed = isPast(wednesday);

  const friday = new Date(weekStart);
  friday.setDate(friday.getDate() + 4);

  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const periodLabel = getPeriodLabel(period, rangeStart, rangeEnd);
  const compLabel = getComparisonLabel(period);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }, []);
  const firstName = user?.email?.split('@')[0] || 'Usuário';

  // Top produtos
  const topProdutos = useMemo(() => {
    const map: Record<string, { nome: string; qtd: number; valor: number }> = {};
    pedidosAtivos.forEach((pedido: any) => {
      const observacoes = String(pedido.observacoes || '');
      const nome = observacoes || 'Pedido sem detalhe';
      if (!map[nome]) map[nome] = { nome, qtd: 0, valor: 0 };
      map[nome].qtd += 1;
      map[nome].valor += Number(pedido.valor_total);
    });
    return Object.values(map).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  }, [pedidosAtivos]);

  const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatCurrencyFull = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  // Available years/quarters
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    (data?.allPedidos || []).forEach((p: any) => {
      if (p.data_pedido) years.add(new Date(p.data_pedido).getFullYear());
    });
    return Array.from(years).sort();
  }, [data?.allPedidos]);

  const quarterLabels = ['Q1', 'Q2', 'Q3', 'Q4'];

  const handleQuarterSelect = (year: number, quarter: number) => {
    setSelectedQuarter({ year, quarter });
    setPeriod('trimestre');
  };

  const periodButtons: { value: PeriodType; label: string }[] = [
    { value: 'semana', label: 'Semana' },
    { value: 'mes', label: 'Mês' },
    { value: 'trimestre', label: 'Trimestre' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tracking-tight text-primary">Taubaté Chopp</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">·</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block capitalize">{periodLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              {period === 'semana' && (
                <Badge
                  variant={deadlinePassed ? "destructive" : "default"}
                  className="text-[10px] gap-1 h-6"
                >
                  {deadlinePassed ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
                  {deadlinePassed ? 'Fechada' : 'Aberta'}
                </Badge>
              )}
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-xs truncate text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/configuracoes" className="cursor-pointer text-xs">
                      <Settings className="h-3.5 w-3.5 mr-2" /> Configurações
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive text-xs cursor-pointer">
                    <LogOut className="h-3.5 w-3.5 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Dense Content */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-4 space-y-4">
        {/* Row 1: Greeting + Quarter Selector */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {greeting}, <span className="font-medium text-foreground">{firstName}</span>
            </p>
            <span className="text-[10px] text-muted-foreground capitalize">{periodLabel}</span>
          </div>

          {/* Year/Quarter selector */}
          <div className="flex flex-wrap items-center gap-3">
            {availableYears.map(year => (
              <div key={year} className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-muted-foreground mr-1">{year}</span>
                <div className="flex items-center bg-muted/50 rounded-lg p-0.5 border border-border/40">
                  {quarterLabels.map((ql, qi) => {
                    const q = qi + 1;
                    const isSelected = selectedQuarter?.year === year && selectedQuarter?.quarter === q;
                    return (
                      <button
                        key={`${year}-${q}`}
                        onClick={() => handleQuarterSelect(year, q)}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-medium rounded-md transition-all",
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {ql}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: 4 KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Litros vendidos */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Litros Vendidos</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{litrosPeriodo.toLocaleString('pt-BR')}L</p>
            <div className="flex items-center gap-2">
              {litrosTrend !== 0 && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                  litrosTrend > 0 ? "text-emerald-700 bg-emerald-500/10" : "text-red-600 bg-red-500/10"
                )}>
                  {litrosTrend > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(litrosTrend).toFixed(0)}%
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">{compLabel}</span>
            </div>
          </div>

          {/* Faturamento vs Meta */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Faturamento</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(faturamento)}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Meta: {formatCurrency(meta)}</span>
                <span className={cn(
                  "text-[10px] font-semibold",
                  metaProgress >= 100 ? "text-emerald-600" : metaProgress >= 70 ? "text-amber-600" : "text-red-500"
                )}>
                  {metaProgress.toFixed(0)}%
                </span>
              </div>
              <Progress value={metaProgress} className="h-1.5" />
              {faltaMeta > 0 && (
                <span className="text-[10px] text-muted-foreground">Faltam {formatCurrency(faltaMeta)}</span>
              )}
            </div>
          </div>

          {/* Clientes ativos */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Clientes Ativos</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{clientesAtivos}</p>
            <div className="flex items-center gap-2">
              {clientesTrend !== 0 && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                  clientesTrend > 0 ? "text-emerald-700 bg-emerald-500/10" : "text-red-600 bg-red-500/10"
                )}>
                  {clientesTrend > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(clientesTrend).toFixed(0)}%
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">{pedidosAtivos.length} pedidos</span>
            </div>
          </div>

          {/* Ticket médio */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCurrencyFull(ticketMedio)}</p>
            <div className="flex items-center gap-2">
              {ticketTrend !== 0 && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                  ticketTrend > 0 ? "text-emerald-700 bg-emerald-500/10" : "text-red-600 bg-red-500/10"
                )}>
                  {ticketTrend > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(ticketTrend).toFixed(0)}%
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">{compLabel}</span>
            </div>
          </div>
        </div>

        {/* Row 3: Timeline (week only) / Financial / Status */}
        <div className="grid gap-3 lg:grid-cols-12">
          {/* Week timeline OR period summary */}
          {period === 'semana' ? (
            <Card className="lg:col-span-5 border-border/60">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline da Semana</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-7 gap-1">
                  {daysOfWeek.map((day) => {
                    const isToday = isSameDay(day, now);
                    const isDeadline = isSameDay(day, wednesday);
                    const isDelivery = isSameDay(day, friday);
                    const dayPedidos = pedidos.filter(p => isSameDay(new Date(p.data_pedido), day));
                    const dayVal = dayPedidos.reduce((a, p) => a + Number(p.valor_total), 0);

                    return (
                      <div
                        key={day.toISOString()}
                        className={cn(
                          "rounded-lg border p-1.5 text-center transition-all min-h-[72px] flex flex-col items-center justify-between",
                          isToday && "border-primary bg-primary/5 ring-1 ring-primary/20",
                          isDeadline && !isToday && "border-amber-400/60 bg-amber-500/5",
                          isDelivery && !isToday && "border-emerald-400/60 bg-emerald-500/5",
                          !isToday && !isDeadline && !isDelivery && "border-border/40"
                        )}
                      >
                        <div>
                          <p className={cn("text-[10px] font-bold capitalize", isToday ? "text-primary" : "text-muted-foreground")}>
                            {format(day, 'EEE', { locale: ptBR })}
                          </p>
                          <p className="text-[9px] text-muted-foreground/70">{format(day, 'dd')}</p>
                        </div>
                        <div>
                          {isDeadline && <AlertCircle className="h-3 w-3 text-amber-500 mx-auto" />}
                          {isDelivery && <Truck className="h-3 w-3 text-emerald-500 mx-auto" />}
                          {dayPedidos.length > 0 ? (
                            <>
                              <p className="text-sm font-bold">{dayPedidos.length}</p>
                              <p className="text-[8px] text-muted-foreground">{formatCurrency(dayVal)}</p>
                            </>
                          ) : (
                            <p className="text-[10px] text-muted-foreground/20">—</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="lg:col-span-5 border-border/60">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resumo do {period === 'mes' ? 'Mês' : 'Trimestre'}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/15 text-center">
                    <p className="text-2xl font-bold text-primary">{pedidosAtivos.length}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Pedidos ativos</p>
                  </div>
                  <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/15 text-center">
                    <p className="text-2xl font-bold text-emerald-600">{formatCurrency(faturamento)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Faturamento</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-center">
                    <p className="text-2xl font-bold">{litrosPeriodo.toLocaleString('pt-BR')}L</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Litros vendidos</p>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border/40 text-center">
                    <p className="text-2xl font-bold">{clientesAtivos}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Clientes únicos</p>
                  </div>
                </div>
                {faturamentoAnterior > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-[11px]">
                    {faturamento >= faturamentoAnterior ? (
                      <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                    )}
                    <span className="text-muted-foreground">
                      {compLabel}: {formatCurrency(faturamentoAnterior)}
                      <span className={cn(
                        "ml-1 font-semibold",
                        faturamento >= faturamentoAnterior ? "text-emerald-600" : "text-red-500"
                      )}>
                        ({faturamento >= faturamentoAnterior ? '+' : ''}{((faturamento - faturamentoAnterior) / faturamentoAnterior * 100).toFixed(0)}%)
                      </span>
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Financial summary */}
          <Card className="lg:col-span-3 border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                <div>
                  <p className="text-[10px] text-muted-foreground">A Receber</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrencyFull(totalReceber)}</p>
                </div>
                <Badge variant="outline" className="text-[9px] h-5 border-emerald-500/30 text-emerald-600">{contasAReceber.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/15">
                <div>
                  <p className="text-[10px] text-muted-foreground">A Pagar</p>
                  <p className="text-sm font-bold text-red-500">{formatCurrencyFull(totalPagar)}</p>
                </div>
                <Badge variant="outline" className="text-[9px] h-5 border-red-500/30 text-red-500">{contasAPagar.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <div>
                  <p className="text-[10px] text-muted-foreground">Saldo</p>
                  <p className={cn("text-sm font-bold", (totalReceber - totalPagar) >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {formatCurrencyFull(totalReceber - totalPagar)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status + Alerts */}
          <Card className="lg:col-span-4 border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Operacional</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <p className="text-lg font-bold text-amber-600">{pedidosPendentes}</p>
                  <p className="text-[9px] text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <p className="text-lg font-bold text-emerald-600">{pedidosPagos}</p>
                  <p className="text-[9px] text-muted-foreground">Confirmados</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/15">
                  <p className="text-lg font-bold text-primary">{pedidos.length}</p>
                  <p className="text-[9px] text-muted-foreground">Total</p>
                </div>
              </div>

              <div className="space-y-1.5">
                {pedidosPendentes > 0 && (period !== 'semana' || !deadlinePassed) && (
                  <NavLink to="/pedidos" className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 transition-colors">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-[11px] flex-1">{pedidosPendentes} aguardando confirmação</span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                  </NavLink>
                )}
                {produtosAlerta.length > 0 && (
                  <NavLink to="/estoque" className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-colors">
                    <Package className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="text-[11px] flex-1">{produtosAlerta.length} produto{produtosAlerta.length > 1 ? 's' : ''} em alerta de estoque</span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                  </NavLink>
                )}
                {data?.whatsapp && data.whatsapp.status !== 'connected' && (
                  <NavLink to="/whatsapp" className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted transition-colors">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] flex-1">WhatsApp desconectado</span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                  </NavLink>
                )}
                {period === 'semana' && deadlinePassed && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/15">
                    <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-[11px]">Prazo encerrado — entrega {format(friday, "EEE dd/MM", { locale: ptBR })}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Pedidos recentes + Top produtos */}
        <div className="grid gap-3 lg:grid-cols-12">
          <Card className="lg:col-span-8 border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Pedidos {period === 'semana' ? 'da Semana' : period === 'mes' ? 'do Mês' : 'do Trimestre'}
                </CardTitle>
                <NavLink to="/pedidos" className="text-[10px] text-primary hover:underline font-medium">Ver todos →</NavLink>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {pedidos.length > 0 ? (
                <div className="space-y-1">
                  {pedidos.slice(0, 10).map((pedido) => {
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      pendente: { label: 'Pendente', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
                      pago: { label: 'Pago', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
                      entregue: { label: 'Entregue', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
                      cancelado: { label: 'Cancelado', cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
                    };
                    const st = statusMap[pedido.status] || { label: pedido.status, cls: 'bg-muted text-muted-foreground' };

                    return (
                      <div
                        key={pedido.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[10px] text-muted-foreground font-mono w-8 shrink-0">#{pedido.numero_pedido}</span>
                          <span className="text-xs font-medium truncate">{clientesMapObj[pedido.cliente_id] || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold tabular-nums">{formatCurrency(Number(pedido.valor_total))}</span>
                          <Badge className={cn("text-[9px] h-5 border", st.cls)}>{st.label}</Badge>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(pedido.data_pedido), "dd/MM")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum pedido neste período</p>
              )}
            </CardContent>
          </Card>

          {/* Top produtos */}
          <Card className="lg:col-span-4 border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Produtos</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {topProdutos.length > 0 ? (
                <div className="space-y-2">
                  {topProdutos.map((prod, i) => (
                    <div key={prod.nome} className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center shrink-0",
                        i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{prod.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{prod.qtd}× · {formatCurrency(prod.valor)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 5: Quick Access */}
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Acesso Rápido</h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {/* Atalhos fixos: Clientes e Leads */}
            <NavLink
              to="/clientes"
              className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/30 hover:border-primary/20 hover:bg-primary/5 transition-all text-center"
            >
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-medium">Clientes</span>
            </NavLink>
            <NavLink
              to="/clientes?tab=leads"
              className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/30 hover:border-primary/20 hover:bg-primary/5 transition-all text-center"
            >
              <UserPlus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-medium">Leads</span>
            </NavLink>
            <NavLink
              to="/lojistas"
              className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/30 hover:border-primary/20 hover:bg-primary/5 transition-all text-center"
            >
              <Store className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-medium">Lojistas</span>
            </NavLink>
            {filteredModules.filter(item => item.key !== 'clientes' && item.key !== 'crm' && item.key !== 'lojistas').map((item) => (
              <NavLink
                key={item.key}
                to={item.href}
                className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/30 hover:border-primary/20 hover:bg-primary/5 transition-all text-center"
              >
                <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
