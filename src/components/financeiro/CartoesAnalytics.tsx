import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ComposedChart,
  Area,
  Legend,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Calendar,
  CreditCard,
  ArrowRight,
  Target,
  PieChart as PieChartIcon,
  BarChart3,
  Wallet,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CartoesAnalyticsProps {
  cartoes: any[];
  faturas: any[];
  transactions?: any[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(142, 76%, 36%)',
];

const PARETO_LINE_COLOR = 'hsl(var(--destructive))';

export function CartoesAnalytics({ cartoes, faturas, transactions }: CartoesAnalyticsProps) {
  const [selectedPeriod, setSelectedPeriod] = useState('6');
  const now = new Date();

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // 1. Evolução das faturas por mês (últimos N meses)
  const evolutionData = useMemo(() => {
    const months = parseInt(selectedPeriod);
    const data: { month: string; label: string; total: number; byCard: Record<string, number> }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = subMonths(now, i);
      const monthStr = format(date, 'yyyy-MM');
      const label = format(date, 'MMM/yy', { locale: ptBR });

      const monthFaturas = faturas?.filter(f => f.competencia.startsWith(monthStr)) || [];
      const total = monthFaturas.reduce((sum, f) => sum + (f.total_value || 0), 0);

      const byCard: Record<string, number> = {};
      cartoes?.forEach(c => {
        const cardFaturas = monthFaturas.filter(f => f.credit_card_id === c.id);
        byCard[c.name] = cardFaturas.reduce((sum, f) => sum + (f.total_value || 0), 0);
      });

      data.push({ month: monthStr, label, total, byCard });
    }

    return data;
  }, [faturas, cartoes, selectedPeriod]);

  // 2. Próximas faturas (próximos 6 meses)
  const proximasFaturas = useMemo(() => {
    const data: { month: string; label: string; total: number; status: string }[] = [];

    for (let i = 0; i < 6; i++) {
      const date = addMonths(now, i);
      const monthStr = format(date, 'yyyy-MM');
      const label = format(date, 'MMM/yy', { locale: ptBR });

      const monthFaturas = faturas?.filter(f => f.competencia.startsWith(monthStr)) || [];
      const total = monthFaturas.reduce((sum, f) => sum + (f.total_value || 0), 0);
      const status = i === 0 ? 'atual' : 'futuro';

      data.push({ month: monthStr, label, total, status });
    }

    return data;
  }, [faturas]);

  // 3. Distribuição por cartão (atual)
  const distribuicaoCartoes = useMemo(() => {
    const currentMonth = format(now, 'yyyy-MM');
    
    return cartoes?.map(c => {
      const cardFaturas = faturas?.filter(
        f => f.credit_card_id === c.id && f.competencia.startsWith(currentMonth)
      ) || [];
      const total = cardFaturas.reduce((sum, f) => sum + (f.total_value || 0), 0);
      return {
        name: c.name,
        value: total,
        limit: c.limit_value || 0,
        usage: c.limit_value ? (total / c.limit_value) * 100 : 0,
      };
    }).filter(c => c.value > 0).sort((a, b) => b.value - a.value) || [];
  }, [cartoes, faturas]);

  // 4. Pareto de gastos por categoria (baseado em transações se disponível)
  const paretoData = useMemo(() => {
    if (!transactions || transactions.length === 0) {
      // Fallback: usar dados por cartão
      const sortedCards = [...(distribuicaoCartoes || [])].sort((a, b) => b.value - a.value);
      const total = sortedCards.reduce((sum, c) => sum + c.value, 0);
      let cumulative = 0;

      return sortedCards.map(c => {
        cumulative += c.value;
        return {
          name: c.name.length > 15 ? c.name.slice(0, 12) + '...' : c.name,
          fullName: c.name,
          value: c.value,
          percentage: total > 0 ? (c.value / total) * 100 : 0,
          cumulative: total > 0 ? (cumulative / total) * 100 : 0,
        };
      });
    }

    // Agrupar por categoria
    const byCategory = transactions.reduce((acc: Record<string, number>, t: any) => {
      const cat = t.categories?.name || 'Sem Categoria';
      acc[cat] = (acc[cat] || 0) + (t.amount || 0);
      return acc;
    }, {} as Record<string, number>);

    const sortedCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10);

    const total = sortedCategories.reduce((sum, [, v]) => sum + (v as number), 0);
    let cumulative = 0;

    return sortedCategories.map(([name, value]) => {
      cumulative += (value as number);
      return {
        name: name.length > 15 ? name.slice(0, 12) + '...' : name,
        fullName: name,
        value: value as number,
        percentage: total > 0 ? ((value as number) / total) * 100 : 0,
        cumulative: total > 0 ? (cumulative / total) * 100 : 0,
      };
    });
  }, [transactions, distribuicaoCartoes]);

  // 5. KPIs calculados
  const kpis = useMemo(() => {
    const currentMonth = format(now, 'yyyy-MM');
    const lastMonth = format(subMonths(now, 1), 'yyyy-MM');

    const currentTotal = faturas?.filter(f => f.competencia.startsWith(currentMonth))
      .reduce((sum, f) => sum + (f.total_value || 0), 0) || 0;

    const lastTotal = faturas?.filter(f => f.competencia.startsWith(lastMonth))
      .reduce((sum, f) => sum + (f.total_value || 0), 0) || 0;

    const variation = lastTotal > 0 ? ((currentTotal - lastTotal) / lastTotal) * 100 : 0;

    const totalLimit = cartoes?.reduce((sum, c) => sum + (c.limit_value || 0), 0) || 0;
    const usagePercent = totalLimit > 0 ? (currentTotal / totalLimit) * 100 : 0;

    const faturasAbertas = faturas?.filter(f => f.status === 'ABERTA' || f.status === 'FECHADA').length || 0;
    const totalAberto = faturas?.filter(f => f.status === 'ABERTA' || f.status === 'FECHADA')
      .reduce((sum, f) => sum + (f.total_value || 0), 0) || 0;

    const avgMonthly = evolutionData.length > 0
      ? evolutionData.reduce((sum, m) => sum + m.total, 0) / evolutionData.length
      : 0;

    return {
      currentTotal,
      lastTotal,
      variation,
      totalLimit,
      usagePercent,
      faturasAbertas,
      totalAberto,
      avgMonthly,
    };
  }, [faturas, cartoes, evolutionData]);

  // 6. Comparativo mensal (mês atual vs anterior)
  const comparativo = useMemo(() => {
    return cartoes?.map(c => {
      const currentMonth = format(now, 'yyyy-MM');
      const lastMonth = format(subMonths(now, 1), 'yyyy-MM');

      const current = faturas?.filter(f => f.credit_card_id === c.id && f.competencia.startsWith(currentMonth))
        .reduce((sum, f) => sum + (f.total_value || 0), 0) || 0;

      const last = faturas?.filter(f => f.credit_card_id === c.id && f.competencia.startsWith(lastMonth))
        .reduce((sum, f) => sum + (f.total_value || 0), 0) || 0;

      const variation = last > 0 ? ((current - last) / last) * 100 : 0;

      return {
        name: c.name,
        atual: current,
        anterior: last,
        variation,
      };
    }).filter(c => c.atual > 0 || c.anterior > 0) || [];
  }, [cartoes, faturas]);

  const chartConfig = {
    total: { label: 'Total', color: 'hsl(var(--primary))' },
    atual: { label: 'Atual', color: 'hsl(var(--primary))' },
    anterior: { label: 'Anterior', color: 'hsl(var(--muted-foreground))' },
    value: { label: 'Valor', color: 'hsl(var(--primary))' },
    cumulative: { label: 'Acumulado %', color: 'hsl(var(--destructive))' },
  };

  return (
    <div className="space-y-6">
      {/* KPIs Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Fatura Atual</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.currentTotal)}</p>
                <div className="flex items-center gap-1 mt-1">
                  {kpis.variation !== 0 && (
                    <>
                      {kpis.variation > 0 ? (
                        <TrendingUp className="h-3 w-3 text-destructive" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-emerald-500" />
                      )}
                      <span className={cn(
                        "text-xs font-medium",
                        kpis.variation > 0 ? "text-destructive" : "text-emerald-500"
                      )}>
                        {Math.abs(kpis.variation).toFixed(1)}%
                      </span>
                    </>
                  )}
                  <span className="text-xs text-muted-foreground">vs mês anterior</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Uso do Limite</p>
                <p className="text-2xl font-bold mt-1">{kpis.usagePercent.toFixed(0)}%</p>
                <Progress 
                  value={Math.min(kpis.usagePercent, 100)} 
                  className={cn(
                    "h-1.5 mt-2",
                    kpis.usagePercent > 80 && "[&>div]:bg-destructive"
                  )}
                />
              </div>
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                kpis.usagePercent > 80 ? "bg-destructive/10" : "bg-amber-500/10"
              )}>
                <Target className={cn(
                  "h-5 w-5",
                  kpis.usagePercent > 80 ? "text-destructive" : "text-amber-500"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Total em Aberto</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.totalAberto)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {kpis.faturasAbertas} {kpis.faturasAbertas === 1 ? 'fatura' : 'faturas'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Média Mensal</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(kpis.avgMonthly)}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  últimos {selectedPeriod} meses
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Mensal */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                Evolução Mensal
              </CardTitle>
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[100px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 meses</SelectItem>
                  <SelectItem value="6">6 meses</SelectItem>
                  <SelectItem value="12">12 meses</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <BarChart data={evolutionData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis 
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} 
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value) => formatCurrency(Number(value))}
                  />} 
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Próximas Faturas */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Projeção de Faturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ComposedChart data={proximasFaturas}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis 
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <ChartTooltip 
                  content={<ChartTooltipContent 
                    formatter={(value) => formatCurrency(Number(value))}
                  />}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  fill="hsl(var(--primary) / 0.2)" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pareto Chart */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Análise de Pareto
              <Badge variant="secondary" className="text-xs ml-2">80/20</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[280px] w-full">
              <ComposedChart data={paretoData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fontSize: 10 }}
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis 
                  yAxisId="left"
                  tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  tick={{ fontSize: 11 }}
                />
                <YAxis 
                  yAxisId="right"
                  orientation="right"
                  tickFormatter={(v) => `${v.toFixed(0)}%`}
                  tick={{ fontSize: 11 }}
                  domain={[0, 100]}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-popover border rounded-lg p-3 shadow-lg">
                          <p className="font-medium text-sm">{data.fullName}</p>
                          <p className="text-sm text-muted-foreground">
                            Valor: {formatCurrency(data.value)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Participação: {data.percentage.toFixed(1)}%
                          </p>
                          <p className="text-sm text-destructive">
                            Acumulado: {data.cumulative.toFixed(1)}%
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar 
                  yAxisId="left" 
                  dataKey="value" 
                  fill="hsl(var(--primary))" 
                  radius={[4, 4, 0, 0]} 
                />
                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="cumulative" 
                  stroke={PARETO_LINE_COLOR}
                  strokeWidth={2}
                  dot={{ r: 4, fill: PARETO_LINE_COLOR }}
                />
                {/* 80% reference line */}
                <Line 
                  yAxisId="right"
                  type="monotone"
                  dataKey={() => 80}
                  stroke="hsl(var(--muted-foreground))"
                  strokeDasharray="5 5"
                  strokeWidth={1}
                  dot={false}
                />
              </ComposedChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Cartão */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              Distribuição por Cartão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <ChartContainer config={chartConfig} className="h-[200px] w-[200px]">
                <PieChart>
                  <Pie
                    data={distribuicaoCartoes}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {distribuicaoCartoes.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip 
                    content={<ChartTooltipContent 
                      formatter={(value) => formatCurrency(Number(value))}
                    />}
                  />
                </PieChart>
              </ChartContainer>
              <div className="flex-1 space-y-2">
                {distribuicaoCartoes.map((card, index) => (
                  <div key={card.name} className="flex items-center gap-2">
                    <div 
                      className="h-3 w-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm flex-1 truncate">{card.name}</span>
                    <span className="text-sm font-medium">{formatCurrency(card.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Comparativo Mensal */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRight className="h-4 w-4 text-primary" />
            Comparativo: {format(subMonths(now, 1), 'MMM', { locale: ptBR })} vs {format(now, 'MMM', { locale: ptBR })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px] w-full">
            <BarChart data={comparativo} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
              <XAxis 
                type="number"
                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                tick={{ fontSize: 11 }}
              />
              <YAxis 
                type="category"
                dataKey="name" 
                tick={{ fontSize: 11 }}
                width={100}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  formatter={(value) => formatCurrency(Number(value))}
                />}
              />
              <Legend />
              <Bar dataKey="anterior" name="Mês Anterior" fill="hsl(var(--muted-foreground) / 0.5)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="atual" name="Mês Atual" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Próximos Vencimentos */}
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Próximos Vencimentos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cartoes?.filter(c => c.is_active).map(cartao => {
              const currentMonth = format(now, 'yyyy-MM');
              const fatura = faturas?.find(
                f => f.credit_card_id === cartao.id && 
                     f.competencia.startsWith(currentMonth) &&
                     f.status !== 'PAGA'
              );

              if (!fatura) return null;

              const dueDate = fatura.due_date ? new Date(fatura.due_date) : null;
              const daysUntilDue = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
              const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
              const isUrgent = daysUntilDue !== null && daysUntilDue <= 5 && daysUntilDue >= 0;

              return (
                <div 
                  key={cartao.id}
                  className={cn(
                    "flex items-center justify-between p-4 rounded-lg border transition-colors",
                    isOverdue ? "bg-destructive/5 border-destructive/30" :
                    isUrgent ? "bg-amber-500/5 border-amber-500/30" :
                    "bg-muted/30 border-border/50"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center",
                      isOverdue ? "bg-destructive/10" :
                      isUrgent ? "bg-amber-500/10" :
                      "bg-primary/10"
                    )}>
                      <CreditCard className={cn(
                        "h-6 w-6",
                        isOverdue ? "text-destructive" :
                        isUrgent ? "text-amber-500" :
                        "text-primary"
                      )} />
                    </div>
                    <div>
                      <p className="font-semibold">{cartao.name}</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-muted-foreground">
                          Vence: {dueDate ? format(dueDate, 'dd/MM/yyyy') : 'N/A'}
                        </p>
                        {daysUntilDue !== null && (
                          <Badge variant={isOverdue ? 'destructive' : isUrgent ? 'secondary' : 'outline'} className="text-xs">
                            {isOverdue 
                              ? `${Math.abs(daysUntilDue)} dias atrasado`
                              : daysUntilDue === 0 
                                ? 'Vence hoje!'
                                : `${daysUntilDue} dias`
                            }
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(fatura.total_value || 0)}</p>
                    <Badge variant={fatura.status === 'FECHADA' ? 'default' : 'outline'} className="text-xs">
                      {fatura.status === 'FECHADA' ? 'Fechada' : 'Aberta'}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
