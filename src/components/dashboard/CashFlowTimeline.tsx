import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
} from 'lucide-react';
import { useCashFlowTimeline, CashFlowMonthly } from '@/hooks/useCashFlowTimeline';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';
import { motion, AnimatePresence } from 'framer-motion';

type MetricKey = 'acumulado' | 'receitas' | 'despesas' | 'saldo';

interface MetricConfig {
  key: MetricKey;
  label: string;
  color: string;
  icon: typeof TrendingUp;
  description: string;
}

const METRICS: MetricConfig[] = [
  { key: 'acumulado', label: 'Saldo Acumulado', color: '#3b82f6', icon: Activity, description: 'Evolução do caixa' },
  { key: 'receitas', label: 'Receitas', color: '#10b981', icon: ArrowUpRight, description: 'Entradas no período' },
  { key: 'despesas', label: 'Despesas', color: '#ef4444', icon: ArrowDownRight, description: 'Saídas no período' },
  { key: 'saldo', label: 'Resultado', color: '#f59e0b', icon: Target, description: 'Receitas - Despesas' },
];

export function CashFlowTimeline() {
  const { data: allData, isLoading } = useCashFlowTimeline();
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(new Set(['acumulado', 'receitas', 'despesas']));
  const [centerDate, setCenterDate] = useState(new Date());
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const toggleMetric = useCallback((key: MetricKey) => {
    setActiveMetrics(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const windowData = useMemo(() => {
    if (!allData?.length) return [];
    const start = format(subMonths(centerDate, 6), 'yyyy-MM');
    const end = format(addMonths(centerDate, 6), 'yyyy-MM');
    return allData.filter(d => d.monthKey >= start && d.monthKey <= end);
  }, [allData, centerDate]);

  const currentMonthKey = format(new Date(), 'yyyy-MM');

  // Derived KPIs
  const kpis = useMemo(() => {
    if (!windowData.length) return null;
    const realData = windowData.filter(d => !d.isProjection);
    const projData = windowData.filter(d => d.isProjection);
    const lastReal = realData[realData.length - 1];
    const lastProj = projData[projData.length - 1];
    const totalReceitas = realData.reduce((a, d) => a + d.receitas, 0);
    const totalDespesas = realData.reduce((a, d) => a + d.despesas, 0);
    const prevWindow = realData.slice(0, Math.max(1, Math.floor(realData.length / 2)));
    const currWindow = realData.slice(Math.floor(realData.length / 2));
    const prevAvg = prevWindow.length ? prevWindow.reduce((a, d) => a + d.saldo, 0) / prevWindow.length : 0;
    const currAvg = currWindow.length ? currWindow.reduce((a, d) => a + d.saldo, 0) / currWindow.length : 0;
    const trend = prevAvg !== 0 ? ((currAvg - prevAvg) / Math.abs(prevAvg)) * 100 : 0;

    return {
      saldoAtual: lastReal?.acumulado || 0,
      projecao6m: lastProj?.acumulado || lastReal?.acumulado || 0,
      totalReceitas,
      totalDespesas,
      resultado: totalReceitas - totalDespesas,
      trend,
      margemOperacional: totalReceitas > 0 ? ((totalReceitas - totalDespesas) / totalReceitas) * 100 : 0,
    };
  }, [windowData]);

  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000000) return `R$ ${(value / 1000000).toFixed(1)}M`;
    if (Math.abs(value) >= 1000) return `R$ ${(value / 1000).toFixed(0)}k`;
    return `R$ ${value.toFixed(0)}`;
  };

  const formatCurrencyFull = (value: number) =>
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const item = payload[0]?.payload as CashFlowMonthly;
    if (!item) return null;

    return (
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-2xl min-w-[240px]">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
          <p className="font-bold text-sm capitalize text-foreground">{label}</p>
          {item.isProjection && (
            <Badge className="text-[9px] px-2 py-0.5 bg-amber-500/20 text-amber-400 border-amber-500/30 rounded-full">
              Projeção
            </Badge>
          )}
        </div>
        <div className="space-y-2">
          {payload.map((entry: any, i: number) => (
            <div key={i} className="flex items-center justify-between gap-6">
              <div className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
              <span className="font-semibold text-xs tabular-nums text-foreground">
                {formatCurrencyFull(entry.value)}
              </span>
            </div>
          ))}
        </div>
        {item && (
          <div className="mt-3 pt-2 border-t border-border/50 flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground">Margem do mês</span>
            <span className={`text-xs font-bold ${item.saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {item.receitas > 0 ? ((item.saldo / item.receitas) * 100).toFixed(1) : '0'}%
            </span>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="card-elevated overflow-hidden">
        <div className="p-6">
          <Skeleton className="h-6 w-72 mb-4" />
          <div className="grid grid-cols-4 gap-3 mb-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)}
          </div>
          <Skeleton className="h-[420px] w-full rounded-2xl" />
        </div>
      </Card>
    );
  }

  if (!allData?.length) {
    return (
      <Card className="card-elevated overflow-hidden">
        <div className="p-6">
          <div className="h-[420px] flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Activity className="h-10 w-10 opacity-30" />
            <p className="text-sm">Nenhuma transação encontrada</p>
          </div>
        </div>
      </Card>
    );
  }

  const showBars = activeMetrics.has('receitas') || activeMetrics.has('despesas');

  return (
    <Card className="card-elevated overflow-hidden relative">
      {/* Subtle glow effect */}
      <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

      <div className="p-5 pb-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Zap className="h-4.5 w-4.5 text-primary" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground tracking-tight">Fluxo de Caixa Dinâmico</h3>
              <p className="text-[11px] text-muted-foreground">Visão completa do financeiro • Real + Projeção</p>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-background"
              onClick={() => setCenterDate(prev => subMonths(prev, 3))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs px-4 rounded-lg hover:bg-background font-medium"
              onClick={() => setCenterDate(new Date())}
            >
              <Calendar className="h-3 w-3 mr-1.5" />
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-background"
              onClick={() => setCenterDate(prev => addMonths(prev, 3))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* KPI Cards */}
        {kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 mb-4">
            {/* Saldo Atual */}
            <motion.div
              className="p-3 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-600/5 relative overflow-hidden"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <div className="absolute top-0 right-0 w-12 h-12 bg-blue-500/5 rounded-full -translate-y-4 translate-x-4" />
              <p className="text-[10px] font-medium text-blue-400/80 uppercase tracking-wider">Saldo Atual</p>
              <p className={`text-lg font-black tabular-nums mt-0.5 ${kpis.saldoAtual >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {formatCurrency(kpis.saldoAtual)}
              </p>
            </motion.div>

            {/* Receitas */}
            <motion.div
              className="p-3 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <p className="text-[10px] font-medium text-emerald-400/80 uppercase tracking-wider">Receitas</p>
              <p className="text-lg font-black tabular-nums text-emerald-400 mt-0.5">
                {formatCurrency(kpis.totalReceitas)}
              </p>
            </motion.div>

            {/* Despesas */}
            <motion.div
              className="p-3 rounded-xl border border-red-500/20 bg-gradient-to-br from-red-500/10 to-red-600/5"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <p className="text-[10px] font-medium text-red-400/80 uppercase tracking-wider">Despesas</p>
              <p className="text-lg font-black tabular-nums text-red-400 mt-0.5">
                {formatCurrency(kpis.totalDespesas)}
              </p>
            </motion.div>

            {/* Margem */}
            <motion.div
              className="p-3 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <p className="text-[10px] font-medium text-amber-400/80 uppercase tracking-wider">Margem</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className={`text-lg font-black tabular-nums ${kpis.margemOperacional >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                  {kpis.margemOperacional.toFixed(1)}%
                </p>
              </div>
            </motion.div>

            {/* Projeção 6m */}
            <motion.div
              className="p-3 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/10 to-purple-600/5 col-span-2 lg:col-span-1"
              whileHover={{ scale: 1.02 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <p className="text-[10px] font-medium text-purple-400/80 uppercase tracking-wider">Projeção 6m</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                {kpis.projecao6m >= kpis.saldoAtual ? (
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5 text-red-400" />
                )}
                <p className={`text-lg font-black tabular-nums ${kpis.projecao6m >= 0 ? 'text-purple-400' : 'text-red-400'}`}>
                  {formatCurrency(kpis.projecao6m)}
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* Metric Toggles */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {METRICS.map(m => {
            const isActive = activeMetrics.has(m.key);
            const Icon = m.icon;
            return (
              <button
                key={m.key}
                onClick={() => toggleMetric(m.key)}
                className={`
                  inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium
                  transition-all duration-200 border
                  ${isActive
                    ? 'border-transparent text-white shadow-lg'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                  }
                `}
                style={isActive ? {
                  backgroundColor: m.color,
                  boxShadow: `0 4px 14px ${m.color}30`,
                } : {}}
              >
                {isActive ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 opacity-50" />}
                <Icon className="h-3 w-3" />
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Chart */}
      <CardContent className="pt-0 px-3 pb-4">
        <div className="rounded-2xl bg-muted/20 border border-border/50 p-2 pt-4">
          <ResponsiveContainer width="100%" height={420}>
            <ComposedChart
              data={windowData}
              margin={{ top: 20, right: 10, bottom: 5, left: 0 }}
              barCategoryGap="20%"
            >
              <defs>
                <linearGradient id="gradAccum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="gradDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ef4444" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity={0.6} />
                </linearGradient>
                {/* Glow filter */}
                <filter id="glowBlue" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feFlood floodColor="#3b82f6" floodOpacity="0.3" />
                  <feComposite in2="blur" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(var(--border))"
                vertical={false}
                opacity={0.4}
              />

              <XAxis
                dataKey="label"
                axisLine={false}
                tickLine={false}
                fontSize={10}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                interval={0}
                angle={-35}
                textAnchor="end"
                height={45}
              />

              <YAxis
                axisLine={false}
                tickLine={false}
                fontSize={10}
                tickFormatter={formatCurrency}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                width={55}
              />

              <Tooltip
                content={<CustomTooltip />}
                cursor={{
                  fill: 'hsl(var(--primary) / 0.05)',
                  radius: 8,
                }}
              />

              {/* Zero reference */}
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeWidth={1} />

              {/* Today line */}
              {windowData.some(d => d.monthKey === currentMonthKey) && (
                <ReferenceLine
                  x={windowData.find(d => d.monthKey === currentMonthKey)?.label}
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  strokeDasharray="6 3"
                  label={{
                    value: '● HOJE',
                    position: 'top',
                    fill: 'hsl(var(--primary))',
                    fontSize: 9,
                    fontWeight: 800,
                  }}
                />
              )}

              {/* Bars for receitas/despesas */}
              {activeMetrics.has('receitas') && (
                <Bar dataKey="receitas" name="Receitas" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {windowData.map((entry, index) => (
                    <Cell
                      key={`receita-${index}`}
                      fill={entry.isProjection ? '#10b98150' : 'url(#gradReceitas)'}
                      stroke={entry.isProjection ? '#10b98130' : '#10b981'}
                      strokeWidth={entry.isProjection ? 1 : 0}
                      strokeDasharray={entry.isProjection ? '3 2' : '0'}
                    />
                  ))}
                </Bar>
              )}

              {activeMetrics.has('despesas') && (
                <Bar dataKey="despesas" name="Despesas" radius={[4, 4, 0, 0]} maxBarSize={24}>
                  {windowData.map((entry, index) => (
                    <Cell
                      key={`despesa-${index}`}
                      fill={entry.isProjection ? '#ef444450' : 'url(#gradDespesas)'}
                      stroke={entry.isProjection ? '#ef444430' : '#ef4444'}
                      strokeWidth={entry.isProjection ? 1 : 0}
                      strokeDasharray={entry.isProjection ? '3 2' : '0'}
                    />
                  ))}
                </Bar>
              )}

              {/* Saldo line */}
              {activeMetrics.has('saldo') && (
                <Area
                  type="monotone"
                  dataKey="saldo"
                  name="Resultado"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  fill="url(#gradSaldo)"
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: '#f59e0b', fill: 'hsl(var(--card))' }}
                />
              )}

              {/* Acumulado - hero line */}
              {activeMetrics.has('acumulado') && (
                <Line
                  type="monotone"
                  dataKey="acumulado"
                  name="Saldo Acumulado"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props;
                    if (!payload) return <></>;
                    const isToday = payload.monthKey === currentMonthKey;
                    if (isToday) {
                      return (
                        <g>
                          <circle cx={cx} cy={cy} r={8} fill="#3b82f620" />
                          <circle cx={cx} cy={cy} r={5} fill="#3b82f6" stroke="hsl(var(--card))" strokeWidth={2} />
                        </g>
                      );
                    }
                    if (payload.isProjection) {
                      return <circle cx={cx} cy={cy} r={3} fill="none" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="2 2" />;
                    }
                    return <circle cx={cx} cy={cy} r={2.5} fill="#3b82f6" />;
                  }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: '#3b82f6', fill: 'hsl(var(--card))' }}
                  strokeDasharray={undefined}
                  filter="url(#glowBlue)"
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Bottom Legend */}
        <div className="flex items-center justify-between mt-3 px-1">
          <div className="flex items-center gap-4 flex-wrap">
            {METRICS.filter(m => activeMetrics.has(m.key)).map(m => (
              <div key={m.key} className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
                <span className="text-[10px] text-muted-foreground font-medium">{m.label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-primary" style={{ borderTop: '2px dashed hsl(var(--primary))' }} />
              <span>Projeção</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-4 h-0.5 bg-primary" />
              <span>Realizado</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
