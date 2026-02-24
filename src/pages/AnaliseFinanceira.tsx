import { useState, useMemo } from 'react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ComposedChart, Area, Bar, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, ReferenceLine, Cell, Legend, BarChart,
} from 'recharts';
import {
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
  Activity, Target, AlertTriangle, Clock, Percent, Eye, EyeOff,
  ChevronLeft, ChevronRight, Calendar, Zap, Shield, ArrowLeft,
  BarChart3, PieChart, Banknote, CreditCard, FileWarning,
} from 'lucide-react';
import { useAnaliseFinanceira, Regime, StatusFilter, MonthlyData } from '@/hooks/useAnaliseFinanceira';
import { format, subMonths, addMonths, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

type ChartMetric = 'receitas' | 'despesas' | 'saldo' | 'acumulado' | 'inadimplencia';

const CHART_METRICS: { key: ChartMetric; label: string; color: string; icon: typeof Activity }[] = [
  { key: 'acumulado', label: 'Saldo Acumulado', color: '#3b82f6', icon: Activity },
  { key: 'receitas', label: 'Receitas', color: '#10b981', icon: ArrowUpRight },
  { key: 'despesas', label: 'Despesas', color: '#ef4444', icon: ArrowDownRight },
  { key: 'saldo', label: 'Resultado', color: '#f59e0b', icon: Target },
  { key: 'inadimplencia', label: 'Inadimplência %', color: '#8b5cf6', icon: AlertTriangle },
];

export default function AnaliseFinanceira() {
  const navigate = useNavigate();
  const [regime, setRegime] = useState<Regime>('caixa');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const [originFilter, setOriginFilter] = useState<string | undefined>(undefined);
  const [activeMetrics, setActiveMetrics] = useState<Set<ChartMetric>>(new Set(['acumulado', 'receitas', 'despesas']));
  const [centerDate, setCenterDate] = useState(new Date());
  const [chartView, setChartView] = useState<'timeline' | 'comparison'>('timeline');

  const filters = { regime, statusFilter, categoryId, origin: originFilter };
  const { timelineData, kpis, alertas, categoriesBreakdown, categories, isLoading } = useAnaliseFinanceira(filters);

  const toggleMetric = (key: ChartMetric) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  };

  // Windowed data for chart
  const windowData = useMemo(() => {
    if (!timelineData.length) return [];
    const start = format(subMonths(centerDate, 6), 'yyyy-MM');
    const end = format(addMonths(centerDate, 6), 'yyyy-MM');
    return timelineData.filter(d => d.monthKey >= start && d.monthKey <= end);
  }, [timelineData, centerDate]);

  const currentMonthKey = format(new Date(), 'yyyy-MM');

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  const formatCurrencyFull = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload as MonthlyData;
    if (!item) return null;
    return (
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xl min-w-[260px]">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
          <p className="font-bold text-sm capitalize text-foreground">{label}</p>
          <div className="flex items-center gap-1.5">
            <Badge variant="outline" className="text-[9px] px-2 py-0.5 rounded-full">
              {regime === 'caixa' ? 'Caixa' : 'Competência'}
            </Badge>
            {item.isProjection && (
              <Badge className="text-[9px] px-2 py-0.5 bg-amber-500/20 text-amber-400 border-amber-500/30 rounded-full">
                Projeção
              </Badge>
            )}
          </div>
        </div>
        <div className="space-y-1.5">
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-semibold text-xs tabular-nums text-foreground">
                {entry.dataKey === 'inadimplencia' ? `${Number(entry.value).toFixed(1)}%` : formatCurrencyFull(entry.value)}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-2 border-t border-border/50 grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <span className="text-muted-foreground">Pago</span>
            <p className="font-semibold text-emerald-400">{formatCurrency(item.receitasPagas)}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Previsto</span>
            <p className="font-semibold text-amber-400">{formatCurrency(item.receitasPrevistas)}</p>
          </div>
        </div>
      </div>
    );
  };

  // Alertas summary
  const alertaVencidos = alertas.filter(a => a.tipo === 'vencido');
  const alertaSemana = alertas.filter(a => a.tipo === 'vence_semana');
  const alertaRisco = alertas.filter(a => a.tipo === 'risco');

  if (isLoading) {
    return (
      <PageLayout title="Análise Financeira" subtitle="Carregando dados...">
        <div className="space-y-4">
          <div className="grid grid-cols-5 gap-3">
            {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
          <Skeleton className="h-[500px] rounded-2xl" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout
      title="Análise Financeira"
      subtitle="Visão 360° do financeiro — Real + Projeção"
      actions={
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="gap-1.5">
            <ArrowLeft className="h-3.5 w-3.5" />
            Dashboard
          </Button>

          {/* Regime toggle */}
          <Tabs value={regime} onValueChange={(v) => setRegime(v as Regime)}>
            <TabsList className="h-8">
              <TabsTrigger value="caixa" className="text-xs px-3 gap-1.5">
                <Banknote className="h-3 w-3" /> Caixa
              </TabsTrigger>
              <TabsTrigger value="competencia" className="text-xs px-3 gap-1.5">
                <FileWarning className="h-3 w-3" /> Competência
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-[110px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pago">Pagos</SelectItem>
              <SelectItem value="previsto">Previstos</SelectItem>
              <SelectItem value="vencido">Vencidos</SelectItem>
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select value={categoryId || 'all'} onValueChange={(v) => setCategoryId(v === 'all' ? undefined : v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    >
      <div className="space-y-5">
        {/* === KPI CARDS === */}
        {kpis && (
          <div className="space-y-3">
            {/* Row 1: Revenue & Result */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
              <KPICard
                label="Receita Bruta"
                value={formatCurrency(kpis.receitaBruta)}
                icon={DollarSign}
                color="emerald"
                detail={`vs mês ant: ${kpis.crescimentoMensal >= 0 ? '+' : ''}${kpis.crescimentoMensal.toFixed(1)}%`}
                trend={kpis.crescimentoMensal}
              />
              <KPICard
                label="Resultado"
                value={formatCurrency(kpis.resultadoCaixa)}
                icon={Target}
                color={kpis.resultadoCaixa >= 0 ? 'emerald' : 'red'}
                detail={`Entradas: ${formatCurrency(kpis.entradasPeriodo)}`}
              />
              <KPICard
                label="Inadimplência"
                value={`${kpis.inadimplenciaPct.toFixed(1)}%`}
                icon={AlertTriangle}
                color={kpis.inadimplenciaPct > 10 ? 'red' : kpis.inadimplenciaPct > 5 ? 'amber' : 'emerald'}
                detail={formatCurrency(kpis.inadimplencia)}
              />
              <KPICard
                label="Ticket Médio"
                value={formatCurrency(kpis.ticketMedio)}
                icon={BarChart3}
                color="blue"
                detail={`Conversão: ${kpis.taxaConversaoPagamento.toFixed(0)}%`}
              />
              <KPICard
                label="Tempo Médio Pgto"
                value={`${kpis.tempoMedioPagamento.toFixed(0)}d`}
                icon={Clock}
                color={kpis.tempoMedioPagamento > 15 ? 'amber' : 'emerald'}
                detail="dias entre emissão e liquidação"
              />
            </div>

            {/* Row 2: Cash & Projections */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5">
              <KPICard
                label="Saldo Atual"
                value={formatCurrency(kpis.saldoAtual)}
                icon={Banknote}
                color={kpis.saldoAtual >= 0 ? 'blue' : 'red'}
                detail="Caixa realizado"
                large
              />
              <KPICard
                label="Projeção 30d"
                value={formatCurrency(kpis.projecao30d)}
                icon={TrendingUp}
                color={kpis.projecao30d >= kpis.saldoAtual ? 'emerald' : 'red'}
                trend={kpis.projecao30d - kpis.saldoAtual}
              />
              <KPICard
                label="Projeção 60d"
                value={formatCurrency(kpis.projecao60d)}
                icon={TrendingUp}
                color={kpis.projecao60d >= kpis.saldoAtual ? 'emerald' : 'red'}
              />
              <KPICard
                label="Projeção 90d"
                value={formatCurrency(kpis.projecao90d)}
                icon={TrendingUp}
                color={kpis.projecao90d >= kpis.saldoAtual ? 'emerald' : 'red'}
              />
              <KPICard
                label="Compromissos"
                value={formatCurrency(kpis.compromissosFuturos)}
                icon={CreditCard}
                color="amber"
                detail="Boletos + faturas a vencer"
              />
            </div>
          </div>
        )}

        {/* === CAMADA 1: MAIN CHART === */}
        <Card className="card-elevated overflow-hidden relative">
          <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          <div className="p-5 pb-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Zap className="h-4.5 w-4.5 text-primary" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground tracking-tight">
                    Linha do Tempo — Regime de {regime === 'caixa' ? 'Caixa' : 'Competência'}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    {regime === 'caixa'
                      ? 'Quando o dinheiro efetivamente entrou/saiu da conta'
                      : 'Fato gerador: competência do lançamento, independente do pagamento'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-0.5">
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background"
                  onClick={() => setCenterDate(prev => subMonths(prev, 3))}>
                  <ChevronLeft className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs px-4 rounded-lg hover:bg-background font-medium"
                  onClick={() => setCenterDate(new Date())}>
                  <Calendar className="h-3 w-3 mr-1.5" /> Hoje
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-background"
                  onClick={() => setCenterDate(prev => addMonths(prev, 3))}>
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Metric toggles */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {CHART_METRICS.map(m => {
                const isActive = activeMetrics.has(m.key);
                return (
                  <button key={m.key} onClick={() => toggleMetric(m.key)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all duration-200 border
                      ${isActive ? 'border-transparent text-white shadow-lg' : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'}`}
                    style={isActive ? { backgroundColor: m.color, boxShadow: `0 4px 14px ${m.color}30` } : {}}>
                    {isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 opacity-50" />}
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <CardContent className="pt-0 px-3 pb-4">
            <div className="rounded-2xl bg-muted/20 border border-border/50 p-2 pt-4">
              <ResponsiveContainer width="100%" height={450}>
                <ComposedChart data={windowData} margin={{ top: 20, right: 10, bottom: 5, left: 0 }} barCategoryGap="20%">
                  <defs>
                    <linearGradient id="gradAccumA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradSaldoA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gradReceitasA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="gradDespesasA" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                    </linearGradient>
                    <filter id="glowBlueA" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feFlood floodColor="#3b82f6" floodOpacity="0.3" />
                      <feComposite in2="blur" operator="in" />
                      <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} opacity={0.4} />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} fontSize={10}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }} interval={0} angle={-35} textAnchor="end" height={45} />
                  <YAxis yAxisId="left" axisLine={false} tickLine={false} fontSize={10}
                    tickFormatter={formatCurrency} tick={{ fill: 'hsl(var(--muted-foreground))' }} width={55} />
                  {activeMetrics.has('inadimplencia') && (
                    <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} fontSize={10}
                      tickFormatter={(v: number) => `${v.toFixed(0)}%`} tick={{ fill: '#8b5cf6' }} width={40} />
                  )}
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--primary) / 0.05)' }} />
                  <ReferenceLine yAxisId="left" y={0} stroke="hsl(var(--border))" strokeWidth={1} />

                  {windowData.some(d => d.monthKey === currentMonthKey) && (
                    <ReferenceLine yAxisId="left"
                      x={windowData.find(d => d.monthKey === currentMonthKey)?.label}
                      stroke="hsl(var(--primary))" strokeWidth={2} strokeDasharray="6 3"
                      label={{ value: '● HOJE', position: 'top', fill: 'hsl(var(--primary))', fontSize: 9, fontWeight: 800 }}
                    />
                  )}

                  {activeMetrics.has('receitas') && (
                    <Bar yAxisId="left" dataKey="receitas" name="Receitas" radius={[4, 4, 0, 0]} maxBarSize={22}>
                      {windowData.map((entry, index) => (
                        <Cell key={`r-${index}`}
                          fill={entry.isProjection ? '#10b98150' : 'url(#gradReceitasA)'}
                          stroke={entry.isProjection ? '#10b98130' : '#10b981'}
                          strokeWidth={entry.isProjection ? 1 : 0}
                          strokeDasharray={entry.isProjection ? '3 2' : '0'} />
                      ))}
                    </Bar>
                  )}
                  {activeMetrics.has('despesas') && (
                    <Bar yAxisId="left" dataKey="despesas" name="Despesas" radius={[4, 4, 0, 0]} maxBarSize={22}>
                      {windowData.map((entry, index) => (
                        <Cell key={`d-${index}`}
                          fill={entry.isProjection ? '#ef444450' : 'url(#gradDespesasA)'}
                          stroke={entry.isProjection ? '#ef444430' : '#ef4444'}
                          strokeWidth={entry.isProjection ? 1 : 0}
                          strokeDasharray={entry.isProjection ? '3 2' : '0'} />
                      ))}
                    </Bar>
                  )}
                  {activeMetrics.has('saldo') && (
                    <Area yAxisId="left" type="monotone" dataKey="saldo" name="Resultado"
                      stroke="#f59e0b" strokeWidth={2} fill="url(#gradSaldoA)" dot={false}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#f59e0b', fill: 'hsl(var(--card))' }} />
                  )}
                  {activeMetrics.has('acumulado') && (
                    <Line yAxisId="left" type="monotone" dataKey="acumulado" name="Saldo Acumulado"
                      stroke="#3b82f6" strokeWidth={3} filter="url(#glowBlueA)"
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        if (!payload) return <></>;
                        const isToday = payload.monthKey === currentMonthKey;
                        if (isToday) return (
                          <g><circle cx={cx} cy={cy} r={8} fill="#3b82f620" />
                            <circle cx={cx} cy={cy} r={5} fill="#3b82f6" stroke="hsl(var(--card))" strokeWidth={2} /></g>
                        );
                        if (payload.isProjection) return <circle cx={cx} cy={cy} r={3} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="2 2" />;
                        return <circle cx={cx} cy={cy} r={2.5} fill="#3b82f6" />;
                      }}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#3b82f6', fill: 'hsl(var(--card))' }} />
                  )}
                  {activeMetrics.has('inadimplencia') && (
                    <Line yAxisId="right" type="monotone" dataKey="inadimplencia" name="Inadimplência %"
                      stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 3"
                      dot={{ r: 3, fill: '#8b5cf6' }}
                      activeDot={{ r: 5, strokeWidth: 2, stroke: '#8b5cf6', fill: 'hsl(var(--card))' }} />
                  )}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex items-center justify-between mt-3 px-1">
              <div className="flex items-center gap-4 flex-wrap">
                {CHART_METRICS.filter(m => activeMetrics.has(m.key)).map(m => (
                  <div key={m.key} className="flex items-center gap-1.5">
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                    <span className="text-[10px] text-muted-foreground font-medium">{m.label}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-px border-t-2 border-dashed border-muted-foreground" />
                  <span>Projeção</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-muted-foreground" />
                  <span>Realizado</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* === CAMADA 2: CATEGORY BREAKDOWN + COMPARISON === */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Categories */}
          <Card className="card-elevated">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" />
                Quebra por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              {categoriesBreakdown.length > 0 ? (
                <div className="space-y-2.5">
                  {categoriesBreakdown.slice(0, 8).map((cat, i) => {
                    const total = cat.receitas + cat.despesas;
                    const maxTotal = Math.max(...categoriesBreakdown.map(c => c.receitas + c.despesas));
                    const pct = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
                    return (
                      <div key={cat.id} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: cat.color }} />
                            <span className="font-medium text-foreground truncate max-w-[140px]">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-3 tabular-nums">
                            <span className="text-emerald-400">{formatCurrency(cat.receitas)}</span>
                            <span className="text-red-400">{formatCurrency(cat.despesas)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-red-500"
                            style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">Sem dados de categorias</p>
              )}
            </CardContent>
          </Card>

          {/* Year comparison */}
          {kpis && (
            <Card className="card-elevated">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Comparativo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <ComparisonRow
                    label="vs Mês Anterior"
                    current={kpis.receitaBruta}
                    previous={kpis.receitaMesAnterior}
                    formatFn={formatCurrency}
                  />
                  <ComparisonRow
                    label="vs Mesmo Mês Ano Anterior"
                    current={kpis.receitaBruta}
                    previous={kpis.receitaMesmoMesAnoAnterior}
                    formatFn={formatCurrency}
                  />
                  <div className="pt-3 border-t border-border/50 grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">30 dias</p>
                      <p className={`text-sm font-bold ${kpis.projecao30d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(kpis.projecao30d)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">60 dias</p>
                      <p className={`text-sm font-bold ${kpis.projecao60d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(kpis.projecao60d)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">90 dias</p>
                      <p className={`text-sm font-bold ${kpis.projecao90d >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(kpis.projecao90d)}
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* === CAMADA 3: ALERTS & RISK === */}
        <Card className="card-elevated">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Shield className="h-4 w-4 text-primary" />
                Alertas & Risco Financeiro
              </CardTitle>
              <div className="flex items-center gap-2">
                {alertaVencidos.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {alertaVencidos.length} vencidos
                  </Badge>
                )}
                {alertaSemana.length > 0 && (
                  <Badge className="text-[10px] bg-amber-500/20 text-amber-400 border-amber-500/30">
                    {alertaSemana.length} esta semana
                  </Badge>
                )}
                {alertaRisco.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    Risco de caixa
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {alertas.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {alertas.slice(0, 20).map((alerta, i) => (
                  <motion.div
                    key={alerta.id + i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`flex items-center justify-between p-3 rounded-xl border ${
                      alerta.tipo === 'vencido'
                        ? 'border-red-500/30 bg-red-500/5'
                        : alerta.tipo === 'risco'
                        ? 'border-red-500/30 bg-red-500/10'
                        : 'border-amber-500/30 bg-amber-500/5'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                        alerta.tipo === 'vencido' || alerta.tipo === 'risco'
                          ? 'bg-red-500/20'
                          : 'bg-amber-500/20'
                      }`}>
                        {alerta.tipo === 'risco' ? (
                          <Shield className="h-4 w-4 text-red-400" />
                        ) : (
                          <AlertTriangle className={`h-4 w-4 ${alerta.tipo === 'vencido' ? 'text-red-400' : 'text-amber-400'}`} />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground truncate max-w-[300px]">
                          {alerta.descricao}
                        </p>
                        {alerta.vencimento && (
                          <p className="text-[10px] text-muted-foreground">
                            Venc: {format(parseISO(alerta.vencimento), "dd/MM/yyyy")}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className={`text-sm font-bold tabular-nums ${
                      alerta.tipo === 'vencido' || alerta.tipo === 'risco' ? 'text-red-400' : 'text-amber-400'
                    }`}>
                      {formatCurrencyFull(alerta.valor)}
                    </span>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Shield className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-sm">Nenhum alerta no momento 🎉</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}

// === Sub-components ===

function KPICard({ label, value, icon: Icon, color, detail, trend, large }: {
  label: string;
  value: string;
  icon: typeof Activity;
  color: string;
  detail?: string;
  trend?: number;
  large?: boolean;
}) {
  const colorMap: Record<string, string> = {
    emerald: 'border-emerald-500/20 from-emerald-500/10 to-emerald-600/5 text-emerald-400',
    red: 'border-red-500/20 from-red-500/10 to-red-600/5 text-red-400',
    blue: 'border-blue-500/20 from-blue-500/10 to-blue-600/5 text-blue-400',
    amber: 'border-amber-500/20 from-amber-500/10 to-amber-600/5 text-amber-400',
    purple: 'border-purple-500/20 from-purple-500/10 to-purple-600/5 text-purple-400',
  };
  const classes = colorMap[color] || colorMap.blue;
  const [borderClass, ...restClasses] = classes.split(' ');

  return (
    <motion.div
      className={`p-3 rounded-xl border bg-gradient-to-br relative overflow-hidden ${classes}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 400 }}
    >
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-medium uppercase tracking-wider opacity-80">{label}</p>
        <Icon className="h-3.5 w-3.5 opacity-50" />
      </div>
      <p className={`${large ? 'text-xl' : 'text-lg'} font-black tabular-nums mt-0.5`}>{value}</p>
      {detail && <p className="text-[10px] opacity-60 mt-0.5">{detail}</p>}
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-0.5">
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          <span className="text-[10px] font-medium">
            {trend >= 0 ? '+' : ''}{typeof trend === 'number' && Math.abs(trend) > 100 ? formatShort(trend) : `${trend.toFixed(1)}%`}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function ComparisonRow({ label, current, previous, formatFn }: {
  label: string; current: number; previous: number; formatFn: (v: number) => string;
}) {
  const diff = previous > 0 ? ((current - previous) / previous) * 100 : 0;
  const isPositive = diff >= 0;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          {isPositive ? <TrendingUp className="h-3.5 w-3.5 text-emerald-400" /> : <TrendingDown className="h-3.5 w-3.5 text-red-400" />}
          <span className={`text-xs font-bold ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            {isPositive ? '+' : ''}{diff.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Atual</span>
            <span className="font-semibold text-foreground">{formatFn(current)}</span>
          </div>
          <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (current / Math.max(current, previous)) * 100)}%` }} />
          </div>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between text-[10px] mb-1">
            <span className="text-muted-foreground">Anterior</span>
            <span className="font-semibold text-foreground">{formatFn(previous)}</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-muted-foreground/40 rounded-full" style={{ width: `${Math.min(100, (previous / Math.max(current, previous)) * 100)}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function formatShort(value: number): string {
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return value.toFixed(1);
}
