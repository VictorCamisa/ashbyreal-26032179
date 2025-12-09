import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useCartoes } from '@/hooks/useCartoes';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Calendar
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
  Area
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function DashboardFinanceiro() {
  const [entityType, setEntityType] = useState<'LOJA' | 'PARTICULAR'>('LOJA');
  const [referenceMonth, setReferenceMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const { dashboardData, isLoading } = useFinanceiro(entityType, referenceMonth);
  const { faturas } = useCartoes();

  // Calculate upcoming card expenses
  const now = new Date();
  const faturasProximas = faturas?.filter(f => {
    const competencia = new Date(f.competencia);
    return competencia >= now && f.status !== 'PAGA';
  }).slice(0, 3) || [];
  
  const totalFaturasPendentes = faturasProximas.reduce((acc, f) => acc + f.total_value, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Carregando dashboard...</div>
      </div>
    );
  }

  const { totalDespesas, totalReceitas, resultado, despesasPorCategoria } = dashboardData || {
    totalDespesas: 0,
    totalReceitas: 0,
    resultado: 0,
    despesasPorCategoria: []
  };

  const isPositive = resultado >= 0;

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <Select value={entityType} onValueChange={(v: any) => setEntityType(v)}>
          <SelectTrigger className="w-[160px] bg-background">
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
            className="pl-10 pr-4 py-2 border rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receitas</p>
                <p className="text-2xl font-bold text-emerald-600 mt-1">
                  R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1 text-xs text-emerald-600">
                <TrendingUp className="h-3 w-3" />
                <span>Entradas do mês</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas</p>
                <p className="text-2xl font-bold text-destructive mt-1">
                  R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <ArrowDownRight className="h-5 w-5 text-destructive" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1 text-xs text-destructive">
                <TrendingDown className="h-3 w-3" />
                <span>Saídas do mês</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "glass-card overflow-hidden border-l-4",
          isPositive ? "border-l-emerald-500" : "border-l-destructive"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Resultado</p>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  isPositive ? "text-emerald-600" : "text-destructive"
                )}>
                  R$ {resultado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                isPositive ? "bg-emerald-500/10" : "bg-destructive/10"
              )}>
                <Wallet className={cn(
                  "h-5 w-5",
                  isPositive ? "text-emerald-600" : "text-destructive"
                )} />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className={cn(
                "flex items-center gap-1 text-xs",
                isPositive ? "text-emerald-600" : "text-destructive"
              )}>
                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                <span>{isPositive ? 'Saldo positivo' : 'Saldo negativo'}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card overflow-hidden border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturas Cartão</p>
                <p className="text-2xl font-bold text-primary mt-1">
                  R$ {totalFaturasPendentes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{faturasProximas.length} faturas pendentes</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Receitas vs Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart 
                data={[
                  { name: 'Receitas', valor: totalReceitas, fill: 'hsl(142 76% 36%)' },
                  { name: 'Despesas', valor: totalDespesas, fill: 'hsl(var(--destructive))' }
                ]}
                layout="vertical"
                margin={{ left: 20, right: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => `R$ ${v.toLocaleString()}`} />
                <YAxis type="category" dataKey="name" width={80} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="valor" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {despesasPorCategoria && despesasPorCategoria.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={despesasPorCategoria}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {despesasPorCategoria.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Valor']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    layout="vertical" 
                    align="right" 
                    verticalAlign="middle"
                    formatter={(value) => <span className="text-sm text-foreground">{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                Nenhuma despesa no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Card Bills Preview */}
      {faturasProximas.length > 0 && (
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              Próximas Faturas de Cartão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {faturasProximas.map((fatura) => (
                <div 
                  key={fatura.id} 
                  className="p-4 rounded-lg bg-muted/30 border border-border/50"
                >
                  <p className="text-sm text-muted-foreground">
                    {new Date(fatura.competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                  </p>
                  <p className="text-xl font-bold mt-1">
                    R$ {fatura.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {fatura.due_date && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Vence em {new Date(fatura.due_date).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
