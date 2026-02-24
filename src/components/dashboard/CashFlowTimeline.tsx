import { useMemo, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCashFlowTimeline, CashFlowMonthly } from '@/hooks/useCashFlowTimeline';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

type MetricKey = 'acumulado' | 'receitas' | 'despesas' | 'saldo';

interface MetricConfig {
  key: MetricKey;
  label: string;
  color: string;
  gradient: string;
}

const METRICS: MetricConfig[] = [
  { key: 'acumulado', label: 'Saldo Acumulado', color: '#3b82f6', gradient: 'colorAccum' },
  { key: 'receitas', label: 'Receitas', color: '#10b981', gradient: 'colorReceitas' },
  { key: 'despesas', label: 'Despesas', color: '#ef4444', gradient: 'colorDespesas' },
  { key: 'saldo', label: 'Resultado Mensal', color: '#f59e0b', gradient: 'colorSaldo' },
];

export function CashFlowTimeline() {
  const { data: allData, isLoading } = useCashFlowTimeline();
  const [activeMetrics, setActiveMetrics] = useState<Set<MetricKey>>(new Set(['acumulado']));
  const [centerDate, setCenterDate] = useState(new Date());

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

  // Window: 6 months before center, 6 months after center
  const windowData = useMemo(() => {
    if (!allData?.length) return [];
    const start = format(subMonths(centerDate, 6), 'yyyy-MM');
    const end = format(addMonths(centerDate, 6), 'yyyy-MM');
    return allData.filter(d => d.monthKey >= start && d.monthKey <= end);
  }, [allData, centerDate]);

  const currentMonthKey = format(new Date(), 'yyyy-MM');

  // Summary KPIs from visible window
  const kpis = useMemo(() => {
    if (!windowData.length) return null;
    const realData = windowData.filter(d => !d.isProjection);
    const projData = windowData.filter(d => d.isProjection);
    const lastReal = realData[realData.length - 1];
    const lastProj = projData[projData.length - 1];
    const totalReceitas = realData.reduce((a, d) => a + d.receitas, 0);
    const totalDespesas = realData.reduce((a, d) => a + d.despesas, 0);
    return {
      saldoAtual: lastReal?.acumulado || 0,
      projecao: lastProj?.acumulado || lastReal?.acumulado || 0,
      totalReceitas,
      totalDespesas,
      resultado: totalReceitas - totalDespesas,
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
    return (
      <div className="bg-popover border border-border rounded-xl p-3 shadow-xl min-w-[200px]">
        <div className="flex items-center gap-2 mb-2">
          <p className="font-semibold text-sm capitalize">{label}</p>
          {item?.isProjection && (
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4">Projeção</Badge>
          )}
        </div>
        {payload.map((entry: any, i: number) => (
          <div key={i} className="flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <span className="text-muted-foreground">{entry.name}</span>
            </div>
            <span className="font-medium tabular-nums">{formatCurrencyFull(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  };

  if (isLoading) {
    return (
      <Card className="card-elevated">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-64" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[400px] w-full rounded-xl" />
        </CardContent>
      </Card>
    );
  }

  if (!allData?.length) {
    return (
      <Card className="card-elevated">
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Fluxo de Caixa Dinâmico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhuma transação encontrada no sistema
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find projection start index for shading
  const projectionStartIdx = windowData.findIndex(d => d.isProjection);

  return (
    <Card className="card-elevated">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-bold">Fluxo de Caixa Dinâmico</CardTitle>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setCenterDate(prev => subMonths(prev, 3))}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs px-3 rounded-lg"
              onClick={() => setCenterDate(new Date())}
            >
              Hoje
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-lg"
              onClick={() => setCenterDate(prev => addMonths(prev, 3))}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* KPI Summary Row */}
        {kpis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-[10px] text-muted-foreground">Saldo Atual</p>
              <p className={`text-sm font-bold tabular-nums ${kpis.saldoAtual >= 0 ? 'text-blue-500' : 'text-destructive'}`}>
                {formatCurrency(kpis.saldoAtual)}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[10px] text-muted-foreground">Receitas (Real)</p>
              <p className="text-sm font-bold tabular-nums text-emerald-500">{formatCurrency(kpis.totalReceitas)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-[10px] text-muted-foreground">Despesas (Real)</p>
              <p className="text-sm font-bold tabular-nums text-red-500">{formatCurrency(kpis.totalDespesas)}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-[10px] text-muted-foreground">Projeção 6m</p>
              <div className="flex items-center gap-1">
                {kpis.projecao >= kpis.saldoAtual ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-destructive" />
                )}
                <p className={`text-sm font-bold tabular-nums ${kpis.projecao >= 0 ? 'text-amber-500' : 'text-destructive'}`}>
                  {formatCurrency(kpis.projecao)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Metric Toggles */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          {METRICS.map(m => (
            <Button
              key={m.key}
              variant={activeMetrics.has(m.key) ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-[11px] px-3 rounded-lg gap-1.5"
              style={activeMetrics.has(m.key) ? { backgroundColor: m.color, borderColor: m.color } : {}}
              onClick={() => toggleMetric(m.key)}
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: activeMetrics.has(m.key) ? '#fff' : m.color }} />
              {m.label}
            </Button>
          ))}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={400}>
          <ComposedChart data={windowData} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="colorAccum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              {/* Projection zone pattern */}
              <pattern id="projectionPattern" width="6" height="6" patternUnits="userSpaceOnUse">
                <line x1="0" y1="6" x2="6" y2="0" stroke="hsl(var(--muted-foreground))" strokeWidth="0.5" strokeOpacity="0.15" />
              </pattern>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              fontSize={11}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              interval={0}
              angle={-30}
              textAnchor="end"
              height={50}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              fontSize={11}
              tickFormatter={formatCurrency}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              width={60}
            />
            <Tooltip content={<CustomTooltip />} />

            {/* Today reference line */}
            {windowData.some(d => d.monthKey === currentMonthKey) && (
              <ReferenceLine
                x={windowData.find(d => d.monthKey === currentMonthKey)?.label}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                strokeDasharray="4 4"
                label={{
                  value: 'Hoje',
                  position: 'top',
                  fill: 'hsl(var(--primary))',
                  fontSize: 10,
                  fontWeight: 700,
                }}
              />
            )}

            {/* Zero line */}
            <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="2 2" />

            {/* Projection shading */}
            {projectionStartIdx > 0 && windowData.length > projectionStartIdx && (
              <ReferenceArea
                x1={windowData[projectionStartIdx].label}
                x2={windowData[windowData.length - 1].label}
                fill="url(#projectionPattern)"
                fillOpacity={1}
              />
            )}

            {/* Dynamic metric areas */}
            {activeMetrics.has('receitas') && (
              <Area
                type="monotone"
                dataKey="receitas"
                name="Receitas"
                stroke="#10b981"
                strokeWidth={2}
                fill="url(#colorReceitas)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            )}
            {activeMetrics.has('despesas') && (
              <Area
                type="monotone"
                dataKey="despesas"
                name="Despesas"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorDespesas)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            )}
            {activeMetrics.has('saldo') && (
              <Area
                type="monotone"
                dataKey="saldo"
                name="Resultado Mensal"
                stroke="#f59e0b"
                strokeWidth={2}
                fill="url(#colorSaldo)"
                dot={false}
                activeDot={{ r: 4, strokeWidth: 2 }}
              />
            )}
            {activeMetrics.has('acumulado') && (
              <Area
                type="monotone"
                dataKey="acumulado"
                name="Saldo Acumulado"
                stroke="#3b82f6"
                strokeWidth={2.5}
                fill="url(#colorAccum)"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 2 }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-3 flex-wrap">
          {METRICS.filter(m => activeMetrics.has(m.key)).map(m => (
            <div key={m.key} className="flex items-center gap-1.5 text-xs">
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: m.color }} />
              <span className="text-muted-foreground">{m.label}</span>
            </div>
          ))}
          {windowData.some(d => d.isProjection) && (
            <div className="flex items-center gap-1.5 text-xs">
              <div className="h-2 w-2 rounded-sm bg-muted-foreground/20" />
              <span className="text-muted-foreground italic">Zona de projeção</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
