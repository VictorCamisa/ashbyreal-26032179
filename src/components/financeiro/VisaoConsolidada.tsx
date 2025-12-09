import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useCartoes } from '@/hooks/useCartoes';
import { 
  TrendingUp, 
  Building2, 
  User, 
  CreditCard,
  Calendar,
  ArrowRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function VisaoConsolidada() {
  const [referenceMonth, setReferenceMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const { dashboardData: lojaData } = useFinanceiro('LOJA', referenceMonth);
  const { dashboardData: particularData } = useFinanceiro('PARTICULAR', referenceMonth);
  const { faturas } = useCartoes();

  const lojaDespesas = lojaData?.totalDespesas || 0;
  const lojaReceitas = lojaData?.totalReceitas || 0;
  const particularDespesas = particularData?.totalDespesas || 0;
  const totalGeral = lojaDespesas + particularDespesas;
  const percentualParticular = totalGeral > 0 ? (particularDespesas / totalGeral) * 100 : 0;
  const percentualLoja = totalGeral > 0 ? (lojaDespesas / totalGeral) * 100 : 0;

  // Card expenses
  const faturasAbertas = faturas?.filter(f => f.status !== 'PAGA') || [];
  const totalCartoes = faturasAbertas.reduce((acc, f) => acc + f.total_value, 0);

  const dadosComparacao = [
    {
      categoria: 'Despesas',
      Loja: lojaDespesas,
      Particular: particularDespesas
    },
    {
      categoria: 'Cartões',
      Loja: 0,
      Particular: totalCartoes
    }
  ];

  const pieData = [
    { name: 'Loja', value: lojaDespesas, color: 'hsl(var(--primary))' },
    { name: 'Particular', value: particularDespesas, color: 'hsl(var(--chart-2))' },
    { name: 'Cartões', value: totalCartoes, color: 'hsl(var(--chart-3))' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Month Filter */}
      <div className="flex items-center gap-4">
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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="glass-card border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas Loja</p>
                <p className="text-2xl font-bold mt-1">
                  R$ {lojaDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={percentualLoja} className="h-1.5 flex-1" />
                  <span className="text-xs text-muted-foreground">{percentualLoja.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-violet-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Despesas Particulares</p>
                <p className="text-2xl font-bold mt-1">
                  R$ {particularDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <Progress value={percentualParticular} className="h-1.5 flex-1 [&>div]:bg-violet-500" />
                  <span className="text-xs text-muted-foreground">{percentualParticular.toFixed(0)}%</span>
                </div>
              </div>
              <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                <User className="h-5 w-5 text-violet-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturas Cartão</p>
                <p className="text-2xl font-bold mt-1">
                  R$ {totalCartoes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  {faturasAbertas.length} faturas em aberto
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "glass-card border-l-4",
          lojaReceitas - totalGeral >= 0 ? "border-l-emerald-500" : "border-l-destructive"
        )}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Saldo Loja</p>
                <p className={cn(
                  "text-2xl font-bold mt-1",
                  lojaReceitas - lojaDespesas >= 0 ? "text-emerald-600" : "text-destructive"
                )}>
                  R$ {(lojaReceitas - lojaDespesas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Receitas - Despesas
                </p>
              </div>
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center",
                lojaReceitas - lojaDespesas >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"
              )}>
                <TrendingUp className={cn(
                  "h-5 w-5",
                  lojaReceitas - lojaDespesas >= 0 ? "text-emerald-500" : "text-destructive"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Comparativo de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dadosComparacao}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="categoria" />
                <YAxis tickFormatter={(v) => `R$ ${(v/1000).toFixed(0)}k`} />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="Loja" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Particular" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribuição de Despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
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
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Nenhuma despesa no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Total Summary */}
      <Card className="glass-card bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Geral de Despesas</p>
              <p className="text-3xl font-bold mt-1">
                R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{percentualLoja.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Loja</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
              <div className="text-center">
                <p className="text-2xl font-bold text-violet-500">{percentualParticular.toFixed(0)}%</p>
                <p className="text-xs text-muted-foreground">Particular</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
