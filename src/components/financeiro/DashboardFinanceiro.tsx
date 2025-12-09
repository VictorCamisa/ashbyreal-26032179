import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTransacoes } from '@/hooks/useTransacoes';
import { useCartoes } from '@/hooks/useCartoes';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  CartesianGrid
} from 'recharts';
import { cn } from '@/lib/utils';

const COLORS = ['#10b981', '#6366f1', '#f59e0b', '#ec4899', '#f97316', '#14b8a6', '#8b5cf6', '#6b7280'];

export function DashboardFinanceiro() {
  const [referenceMonth, setReferenceMonth] = useState(new Date());
  
  const monthStr = referenceMonth.toISOString().slice(0, 7);
  
  const { transacoes: despesas, isLoading: isLoadingDespesas } = useTransacoes('LOJA', 'PAGAR');
  const { transacoes: receitas, isLoading: isLoadingReceitas } = useTransacoes('LOJA', 'RECEBER');
  const { faturas } = useCartoes();

  // Navigate months
  const handlePrevMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Filter by month
  const filterByMonth = (items: any[]) => {
    return items?.filter(t => t.due_date?.slice(0, 7) === monthStr) || [];
  };

  const filteredDespesas = filterByMonth(despesas);
  const filteredReceitas = filterByMonth(receitas);

  // Calculate totals
  const totalDespesas = filteredDespesas.reduce((acc, t) => acc + Number(t.amount), 0);
  const totalReceitas = filteredReceitas.reduce((acc, t) => acc + Number(t.amount), 0);
  const resultado = totalReceitas - totalDespesas;
  const isPositive = resultado >= 0;

  // Pending invoices
  const faturasPendentes = faturas?.filter(f => f.status !== 'PAGA').slice(0, 3) || [];
  const totalFaturas = faturasPendentes.reduce((acc, f) => acc + f.total_value, 0);

  // Group by category
  const despesasPorCategoria = filteredDespesas.reduce((acc: any[], t) => {
    const catName = (t.categories as any)?.name || 'Outros';
    const existing = acc.find(c => c.name === catName);
    if (existing) {
      existing.value += Number(t.amount);
    } else {
      acc.push({ name: catName, value: Number(t.amount) });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  // Recent transactions (combined)
  const recentTransactions = [...filteredDespesas.slice(0, 5), ...filteredReceitas.slice(0, 5)]
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
    .slice(0, 6);

  const monthLabel = referenceMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (isLoadingDespesas || isLoadingReceitas) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Month Navigation */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-medium capitalize min-w-[160px] text-center">
          {monthLabel}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Receitas</p>
                <p className="text-xl font-bold text-emerald-600">
                  {totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <ArrowUpRight className="h-5 w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Despesas</p>
                <p className="text-xl font-bold text-destructive">
                  {totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ArrowDownRight className="h-5 w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          isPositive ? "ring-1 ring-emerald-200 dark:ring-emerald-800" : "ring-1 ring-red-200 dark:ring-red-800"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Resultado</p>
                <p className={cn(
                  "text-xl font-bold",
                  isPositive ? "text-emerald-600" : "text-destructive"
                )}>
                  {resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className={cn(
                "h-10 w-10 rounded-full flex items-center justify-center",
                isPositive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
              )}>
                <Wallet className={cn(
                  "h-5 w-5",
                  isPositive ? "text-emerald-600" : "text-destructive"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Cartões</p>
                <p className="text-xl font-bold">
                  {totalFaturas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-muted-foreground">
                  {faturasPendentes.length} faturas abertas
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart - Receitas vs Despesas */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Resultado do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart 
                data={[
                  { name: 'Receitas', value: totalReceitas, fill: '#10b981' },
                  { name: 'Despesas', value: totalDespesas, fill: '#ef4444' }
                ]} 
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={12} />
                <YAxis hide />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), '']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '12px'
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Despesas por Categoria */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            {despesasPorCategoria.length > 0 ? (
              <div className="flex items-start gap-4">
                <ResponsiveContainer width={160} height={160}>
                  <PieChart>
                    <Pie
                      data={despesasPorCategoria.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {despesasPorCategoria.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), '']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        fontSize: '12px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2 pt-2">
                  {despesasPorCategoria.slice(0, 5).map((cat, index) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div 
                          className="h-2.5 w-2.5 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-muted-foreground truncate max-w-[100px]">{cat.name}</span>
                      </div>
                      <span className="font-medium tabular-nums">
                        {cat.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[160px] flex items-center justify-center text-sm text-muted-foreground">
                Nenhuma despesa no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Transações Recentes</CardTitle>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
            Ver todas
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentTransactions.length > 0 ? (
            <div className="divide-y">
              {recentTransactions.map((t) => {
                const isPagar = t.tipo === 'PAGAR';
                return (
                  <div key={t.id} className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                        isPagar ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
                      )}>
                        {isPagar 
                          ? <ArrowDownRight className="h-4 w-4 text-destructive" />
                          : <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium">{t.description || 'Sem descrição'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(t.due_date).toLocaleDateString('pt-BR')} • {(t.categories as any)?.name || 'Sem categoria'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={t.status === 'PAGO' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {t.status === 'PAGO' ? 'Pago' : 'Pendente'}
                      </Badge>
                      <span className={cn(
                        "text-sm font-semibold tabular-nums",
                        isPagar ? "text-destructive" : "text-emerald-600"
                      )}>
                        {isPagar ? '-' : '+'}
                        {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhuma transação no período
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
