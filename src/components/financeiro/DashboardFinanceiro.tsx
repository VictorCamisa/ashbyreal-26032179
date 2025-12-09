import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useFinanceiroEvolution } from '@/hooks/useFinanceiroEvolution';
import { useCartoes } from '@/hooks/useCartoes';
import { FinancialHealthIndicator } from './FinancialHealthIndicator';
import { 
  TrendingUp, 
  TrendingDown, 
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Activity,
  PiggyBank,
  BarChart3
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  ComposedChart
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function DashboardFinanceiro() {
  const [entityType, setEntityType] = useState<'LOJA' | 'PARTICULAR'>('LOJA');
  const [referenceMonth, setReferenceMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const { dashboardData, isLoading } = useFinanceiro(entityType, referenceMonth);
  const { evolutionData, isLoading: isLoadingEvolution } = useFinanceiroEvolution(entityType);
  const { faturas } = useCartoes();

  // Calculate upcoming card expenses
  const now = new Date();
  const faturasProximas = faturas?.filter(f => {
    const competencia = new Date(f.competencia);
    return competencia >= now && f.status !== 'PAGA';
  }).slice(0, 3) || [];
  
  const totalFaturasPendentes = faturasProximas.reduce((acc, f) => acc + f.total_value, 0);

  if (isLoading || isLoadingEvolution) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  const { totalDespesas, totalReceitas, resultado, despesasPorCategoria } = dashboardData || {
    totalDespesas: 0,
    totalReceitas: 0,
    resultado: 0,
    despesasPorCategoria: []
  };

  const { monthlyData, trends, avgResultado, savingsRate } = evolutionData || {
    monthlyData: [],
    trends: { receita: 0, despesa: 0 },
    avgResultado: 0,
    savingsRate: 0
  };

  const isPositive = resultado >= 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={entityType} onValueChange={(v: any) => setEntityType(v)}>
          <SelectTrigger className="w-[160px] bg-background/50 backdrop-blur-sm border-border/50">
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOJA">Loja</SelectItem>
            <SelectItem value="PARTICULAR">Particular</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="month"
            value={referenceMonth}
            onChange={(e) => setReferenceMonth(e.target.value)}
            className="pl-10 pr-4 py-2 border border-border/50 rounded-lg bg-background/50 backdrop-blur-sm text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* KPI Cards */}
        <Card className="glass-card overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Receitas</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {trends?.receita !== 0 && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs mt-2",
                    trends.receita >= 0 ? "text-emerald-600" : "text-destructive"
                  )}>
                    {trends.receita >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    <span>{trends.receita >= 0 ? '+' : ''}{trends.receita.toFixed(1)}% vs mês anterior</span>
                  </div>
                )}
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowUpRight className="h-6 w-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Despesas</p>
                <p className="text-2xl font-bold text-destructive mt-1">
                  R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                {trends?.despesa !== 0 && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs mt-2",
                    trends.despesa <= 0 ? "text-emerald-600" : "text-destructive"
                  )}>
                    {trends.despesa <= 0 ? <TrendingDown className="h-3 w-3" /> : <TrendingUp className="h-3 w-3" />}
                    <span>{trends.despesa >= 0 ? '+' : ''}{trends.despesa.toFixed(1)}% vs mês anterior</span>
                  </div>
                )}
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-destructive/20 to-destructive/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <ArrowDownRight className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "glass-card overflow-hidden group hover:shadow-lg transition-all duration-300",
          isPositive ? "ring-1 ring-emerald-500/20" : "ring-1 ring-destructive/20"
        )}>
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Resultado</p>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  isPositive ? "text-emerald-600" : "text-destructive"
                )}>
                  {isPositive ? '+' : ''}R$ {resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className={cn(
                  "flex items-center gap-1 text-xs mt-2",
                  isPositive ? "text-emerald-600" : "text-destructive"
                )}>
                  {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  <span>{isPositive ? 'Saldo positivo' : 'Saldo negativo'}</span>
                </div>
              </div>
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform",
                isPositive ? "bg-gradient-to-br from-emerald-500/20 to-emerald-500/5" : "bg-gradient-to-br from-destructive/20 to-destructive/5"
              )}>
                <Wallet className={cn(
                  "h-6 w-6",
                  isPositive ? "text-emerald-600" : "text-destructive"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden group hover:shadow-lg transition-all duration-300">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Faturas Cartão</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  R$ {totalFaturasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                  <Calendar className="h-3 w-3" />
                  <span>{faturasProximas.length} faturas pendentes</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center group-hover:scale-110 transition-transform">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Evolution Chart - Takes 2 columns */}
        <Card className="glass-card xl:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Evolução Mensal
              </CardTitle>
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground">Receitas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-destructive" />
                  <span className="text-muted-foreground">Despesas</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                  <span className="text-muted-foreground">Resultado</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={monthlyData} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                <defs>
                  <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="rgb(16 185 129)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="rgb(16 185 129)" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--destructive))" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="hsl(var(--destructive))" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="month" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip 
                  formatter={(value: number, name: string) => [
                    `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                    name === 'receitas' ? 'Receitas' : name === 'despesas' ? 'Despesas' : 'Resultado'
                  ]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                  }}
                />
                <Bar dataKey="receitas" fill="rgb(16 185 129)" radius={[4, 4, 0, 0]} barSize={24} />
                <Bar dataKey="despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} barSize={24} />
                <Line 
                  type="monotone" 
                  dataKey="resultado" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={3}
                  dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Financial Health - Takes 1 column */}
        <Card className="glass-card">
          <FinancialHealthIndicator 
            savingsRate={savingsRate} 
            avgResultado={avgResultado}
          />
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expenses by Category */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <PiggyBank className="h-4 w-4 text-primary" />
              Despesas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            {despesasPorCategoria && despesasPorCategoria.length > 0 ? (
              <div className="flex items-center">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie
                      data={despesasPorCategoria}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {despesasPorCategoria.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]}
                          className="hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {despesasPorCategoria.slice(0, 5).map((cat, index) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-3 w-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                        />
                        <span className="text-muted-foreground truncate max-w-[120px]">{cat.name}</span>
                      </div>
                      <span className="font-medium">
                        R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <PiggyBank className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhuma despesa no período</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Card Bills */}
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Próximas Faturas de Cartão
            </CardTitle>
          </CardHeader>
          <CardContent>
            {faturasProximas.length > 0 ? (
              <div className="space-y-3">
                {faturasProximas.map((fatura, index) => (
                  <div 
                    key={fatura.id} 
                    className={cn(
                      "p-4 rounded-xl border transition-all hover:shadow-md",
                      index === 0 
                        ? "bg-primary/5 border-primary/20" 
                        : "bg-muted/30 border-border/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">
                          {new Date(fatura.competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                        {fatura.due_date && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Vence em {new Date(fatura.due_date).toLocaleDateString('pt-BR')}
                          </p>
                        )}
                      </div>
                      <p className={cn(
                        "text-lg font-bold",
                        index === 0 ? "text-primary" : "text-foreground"
                      )}>
                        R$ {fatura.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p>Nenhuma fatura pendente</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
