import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Calendar, CreditCard, TrendingUp, Wallet } from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { formatCompetenciaShort } from '@/lib/dateUtils';

interface CartoesAnalyticsProps {
  cartoes: any[];
  faturas: any[];
  onSelectCard?: (cartao: any) => void;
}

type HorizonMode = 'year' | 'last';

type CardStats = {
  id: string;
  name: string;
  dueDay?: number | null;
  closingDay?: number | null;
  limitValue: number;
  currentInvoice: number;
  openTotal: number;
  forecastTotal: number;
  months: { month: string; label: string; value: number }[];
  usagePercent: number;
  color: string;
  entityId?: string | null;
};

const PALETTE = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(var(--primary))',
];

function currencyShort(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function CartoesAnalytics({ cartoes, faturas, onSelectCard }: CartoesAnalyticsProps) {
  const now = new Date();
  const [periodMonths, setPeriodMonths] = useState<'3' | '6' | '12'>('6');
  const [horizon, setHorizon] = useState<HorizonMode>('year');
  const [activeTab, setActiveTab] = useState<'comparar' | 'timeline' | 'projecao'>('comparar');

  const currentMonthStr = format(now, 'yyyy-MM');

  const monthLabel = (monthStr: string) => {
    return formatCompetenciaShort(monthStr);
  };

  const monthsFromNow = useMemo(() => {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);

    const end = horizon === 'year'
      ? new Date(now.getFullYear(), 11, 1)
      : null;

    const maxCompetenciaByCard = new Map<string, string>();
    if (horizon === 'last') {
      for (const f of faturas || []) {
        const key = f.credit_card_id;
        const comp = (f.competencia || '').slice(0, 7);
        if (!key || !comp) continue;
        const existing = maxCompetenciaByCard.get(key);
        if (!existing || comp > existing) maxCompetenciaByCard.set(key, comp);
      }
    }

    // Monta meses base (até dezembro) e depois recorta por cartão quando necessário
    const baseMonths: string[] = [];
    let cursor = start;
    const baseEnd = end || new Date(now.getFullYear(), 11, 1);

    while (format(cursor, 'yyyy-MM') <= format(baseEnd, 'yyyy-MM')) {
      baseMonths.push(format(cursor, 'yyyy-MM'));
      cursor = addMonths(cursor, 1);
    }

    return { baseMonths, maxCompetenciaByCard };
  }, [faturas, horizon, now]);

  const cardStats = useMemo<CardStats[]>(() => {
    const stats: CardStats[] = [];

    for (let i = 0; i < (cartoes || []).length; i++) {
      const c = cartoes[i];
      const color = PALETTE[i % PALETTE.length];

      // Meses válidos para este cartão (se horizon=last, vai até a última competência que existe nele)
      const maxComp = monthsFromNow.maxCompetenciaByCard.get(c.id);
      const months = monthsFromNow.baseMonths.filter((m) => {
        if (horizon === 'year') return true;
        if (!maxComp) return m >= currentMonthStr; // se não tem nenhuma, mostra só a partir de agora
        return m >= currentMonthStr && m <= maxComp;
      });

      const monthValues = months.map((m) => {
        const monthFaturas = (faturas || []).filter(
          (f) =>
            f.credit_card_id === c.id &&
            (f.competencia || '').startsWith(m) &&
            f.status !== 'PAGA'
        );
        const total = monthFaturas.reduce((sum, f) => sum + (f.total_value || 0), 0);
        return { month: m, label: monthLabel(m), value: total };
      });

      const currentInvoice = monthValues.find((x) => x.month === currentMonthStr)?.value || 0;

      const openInvoices = (faturas || []).filter(
        (f) => f.credit_card_id === c.id && (f.status === 'ABERTA' || f.status === 'FECHADA')
      );
      const openTotal = openInvoices.reduce((sum, f) => sum + (f.total_value || 0), 0);

      const forecastTotal = monthValues.reduce((sum, x) => sum + x.value, 0);
      const limitValue = c.limit_value || 0;
      const usagePercent = limitValue > 0 ? (currentInvoice / limitValue) * 100 : 0;

      stats.push({
        id: c.id,
        name: c.name,
        dueDay: c.due_day,
        closingDay: c.closing_day,
        limitValue,
        currentInvoice,
        openTotal,
        forecastTotal,
        months: monthValues,
        usagePercent,
        color,
        entityId: c.entity_id,
      });
    }

    return stats.sort((a, b) => b.forecastTotal - a.forecastTotal);
  }, [cartoes, faturas, monthsFromNow, horizon, currentMonthStr]);

  const totals = useMemo(() => {
    const forecastAll = cardStats.reduce((sum, c) => sum + c.forecastTotal, 0);
    const openAll = cardStats.reduce((sum, c) => sum + c.openTotal, 0);
    const currentAll = cardStats.reduce((sum, c) => sum + c.currentInvoice, 0);

    const biggest = [...cardStats].sort((a, b) => b.currentInvoice - a.currentInvoice)[0];

    return {
      forecastAll,
      openAll,
      currentAll,
      biggestName: biggest?.name,
      biggestValue: biggest?.currentInvoice || 0,
    };
  }, [cardStats]);

  // Time series (últimos N meses): total do sistema e (top 4 cartões) em linha
  const timeline = useMemo(() => {
    const months = parseInt(periodMonths, 10);

    // Top 4 cartões por exposição (forecast)
    const top = cardStats.slice(0, 4);

    const points: any[] = [];
    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(now, i);
      const month = format(date, 'yyyy-MM');

      const monthFaturas = (faturas || []).filter((f) => (f.competencia || '').startsWith(month));
      const total = monthFaturas.reduce((sum, f) => sum + (f.total_value || 0), 0);

      const point: any = {
        month,
        label: formatCompetenciaShort(month),
        total,
      };

      for (const c of top) {
        const cardMonthTotal = monthFaturas
          .filter((f) => f.credit_card_id === c.id)
          .reduce((sum, f) => sum + (f.total_value || 0), 0);
        point[c.id] = cardMonthTotal;
      }

      points.push(point);
    }

    const config: Record<string, { label: string; color: string }> = {
      total: { label: 'Total', color: 'hsl(var(--primary))' },
    };

    top.forEach((c) => {
      config[c.id] = { label: c.name, color: c.color };
    });

    return { points, top, config };
  }, [periodMonths, now, faturas, cardStats]);

  const maxForecast = Math.max(1, ...cardStats.map((c) => c.forecastTotal));

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold">Inteligência de Cartões</h3>
          <p className="text-sm text-muted-foreground">
            Compare cartões e visualize projeções de faturas ({horizon === 'year' ? 'até Dezembro' : 'até a última fatura cadastrada'}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={horizon} onValueChange={(v) => setHorizon(v as HorizonMode)}>
            <SelectTrigger className="w-[220px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="year">Projeção até Dezembro</SelectItem>
              <SelectItem value="last">Projeção até última fatura</SelectItem>
            </SelectContent>
          </Select>

          <Select value={periodMonths} onValueChange={(v) => setPeriodMonths(v as '3' | '6' | '12')}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="glass-card hover-scale">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Fatura atual (soma)</p>
                <p className="text-2xl font-bold mt-1">{currencyShort(totals.currentAll)}</p>
                <p className="text-xs text-muted-foreground mt-1">{monthLabel(currentMonthStr)}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-scale">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Projeção (soma)</p>
                <p className="text-2xl font-bold mt-1">{currencyShort(totals.forecastAll)}</p>
                <p className="text-xs text-muted-foreground mt-1">horizonte selecionado</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-success" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-scale">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Em aberto (soma)</p>
                <p className="text-2xl font-bold mt-1">{currencyShort(totals.openAll)}</p>
                <p className="text-xs text-muted-foreground mt-1">ABERTA + FECHADA</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                <Wallet className="h-5 w-5 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card hover-scale">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Maior fatura</p>
                <p className="text-2xl font-bold mt-1">{currencyShort(totals.biggestValue)}</p>
                <p className="text-xs text-muted-foreground mt-1 truncate max-w-[140px]">{totals.biggestName || '-'}</p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                <Calendar className="h-5 w-5 text-foreground" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="w-full md:w-auto">
          <TabsTrigger value="comparar">Comparar cartões</TabsTrigger>
          <TabsTrigger value="timeline">Linha do tempo</TabsTrigger>
          <TabsTrigger value="projecao">Próximas faturas</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Comparar */}
      {activeTab === 'comparar' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Ranking de exposição (projeção)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cardStats.length === 0 ? (
                <div className="py-8 text-sm text-muted-foreground text-center">Sem dados de faturas.</div>
              ) : (
                cardStats.map((c, idx) => {
                  const width = (c.forecastTotal / maxForecast) * 100;
                  const isClickable = !!onSelectCard;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onSelectCard?.(cartoes.find((x) => x.id === c.id))}
                      className={cn(
                        "w-full text-left rounded-xl border border-border/50 p-4 transition-all",
                        "hover:bg-muted/40 hover:shadow-sm",
                        isClickable && "cursor-pointer"
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            <p className="font-semibold truncate">{c.name}</p>
                            <Badge variant="secondary" className="text-[10px]">#{idx + 1}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Venc. {c.dueDay || '-'} • Fecha {c.closingDay || '-'}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-sm font-semibold">{currencyShort(c.forecastTotal)}</p>
                          <p className="text-xs text-muted-foreground">projeção</p>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Fatura atual</span>
                            <span className="font-medium text-foreground">{currencyShort(c.currentInvoice)}</span>
                          </div>
                          <Progress value={Math.min(c.usagePercent, 100)} className={cn('h-1.5 mt-2', c.usagePercent > 80 && '[&>div]:bg-destructive')} />
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mt-1">
                            <span>{c.usagePercent.toFixed(0)}% do limite</span>
                            <span>{c.limitValue ? currencyShort(c.limitValue) : 'sem limite'}</span>
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>Barra comparativa</span>
                            <span className="font-medium text-foreground">{width.toFixed(0)}%</span>
                          </div>
                          <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: c.color }} />
                          </div>
                          <p className="text-[11px] text-muted-foreground mt-1">proporção vs maior cartão</p>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>

          <Card className="glass-card animate-fade-in">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Resumo por cartão</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {cardStats.map((c) => {
                const share = totals.forecastAll > 0 ? (c.forecastTotal / totals.forecastAll) * 100 : 0;
                return (
                  <div key={c.id} className="flex items-center justify-between rounded-lg p-3 hover:bg-muted/40 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
                        <CreditCard className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Atual {currencyShort(c.currentInvoice)} • Aberto {currencyShort(c.openTotal)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{share.toFixed(0)}%</p>
                      <p className="text-xs text-muted-foreground">do total</p>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timeline */}
      {activeTab === 'timeline' && (
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evolução (últimos {periodMonths} meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={timeline.config} className="h-[320px] w-full">
              <LineChart data={timeline.points}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent formatter={(v) => currencyShort(Number(v))} />} />

                {/* Total */}
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />

                {/* Top cartões */}
                {timeline.top.map((c) => (
                  <Line
                    key={c.id}
                    type="monotone"
                    dataKey={c.id}
                    stroke={c.color}
                    strokeWidth={2}
                    dot={false}
                  />
                ))}
              </LineChart>
            </ChartContainer>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">Linhas: Total + top {timeline.top.length} cartões</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Projeção / tabela de meses */}
      {activeTab === 'projecao' && (
        <Card className="glass-card animate-fade-in">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Próximas faturas por mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid" style={{ gridTemplateColumns: `260px repeat(${monthsFromNow.baseMonths.length}, 1fr)` }}>
                  {/* Header */}
                  <div className="sticky left-0 bg-card z-10 p-3 text-xs text-muted-foreground border-b">Cartão</div>
                  {monthsFromNow.baseMonths.map((m) => (
                    <div key={m} className="p-3 text-xs text-muted-foreground border-b text-center">{monthLabel(m)}</div>
                  ))}

                  {/* Rows */}
                  {cardStats.map((c) => {
                    const map = new Map(c.months.map((x) => [x.month, x.value]));

                    return (
                      <div key={c.id} className="contents">
                        <div
                          className={cn(
                            'sticky left-0 bg-card z-10 p-3 border-b',
                            'hover:bg-muted/40 transition-colors'
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            <p className="text-sm font-medium truncate">{c.name}</p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">Projeção: {currencyShort(c.forecastTotal)}</p>
                        </div>

                        {monthsFromNow.baseMonths.map((m) => {
                          const v = map.get(m) || 0;
                          const isCurrent = m === currentMonthStr;

                          return (
                            <div
                              key={`${c.id}-${m}`}
                              className={cn('p-3 border-b text-center', isCurrent && 'bg-muted/40')}
                            >
                              {v > 0 ? (
                                <div className="space-y-1">
                                  <div className="text-sm font-semibold">{currencyShort(v)}</div>
                                  <div className="h-1 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className="h-full"
                                      style={{
                                        width: `${Math.min(100, (v / Math.max(1, c.currentInvoice || v)) * 100)}%`,
                                        backgroundColor: c.color,
                                      }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              Dica: esse quadro compara mês a mês; para ver transações, clique no cartão no modo “Comparar cartões”.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
