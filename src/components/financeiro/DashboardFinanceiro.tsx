import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTransacoes } from '@/hooks/useTransacoes';
import { useCartoes } from '@/hooks/useCartoes';
import { useFinanceiroStats } from '@/hooks/useFinanceiroStats';
import { HealthGauge } from './HealthGauge';
import { EvolutionChart } from './EvolutionChart';
import type { TransactionFilter } from '@/pages/Financeiro';
import { 
  ChevronLeft, 
  ChevronRight, 
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CalendarClock,
  ChevronRight as ChevronRightIcon,
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

interface DashboardFinanceiroProps {
  onNavigateToTransactions?: (filter: TransactionFilter) => void;
  onNavigateToCartoes?: () => void;
}

export function DashboardFinanceiro({ onNavigateToTransactions, onNavigateToCartoes }: DashboardFinanceiroProps) {
  const [referenceMonth, setReferenceMonth] = useState(new Date());
  
  const monthStr = referenceMonth.toISOString().slice(0, 7);
  
  const { transacoes: despesas, isLoading: isLoadingDespesas } = useTransacoes('LOJA', 'PAGAR');
  const { transacoes: receitas, isLoading: isLoadingReceitas } = useTransacoes('LOJA', 'RECEBER');
  const { faturas } = useCartoes();
  const { evolutionData, alertStats, isLoading: isLoadingStats } = useFinanceiroStats(referenceMonth);

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

  // Calculate totals (use Math.abs because despesas are stored as negative values)
  const totalDespesas = filteredDespesas.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
  const totalReceitas = filteredReceitas.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0);
  const resultado = totalReceitas - totalDespesas;
  const isPositive = resultado >= 0;

  // Pending invoices
  const faturasPendentes = faturas?.filter(f => f.status !== 'PAGA').slice(0, 3) || [];
  const totalFaturas = faturasPendentes.reduce((acc, f) => acc + f.total_value, 0);

  // Group by category (use absolute values)
  const despesasPorCategoria = filteredDespesas.reduce((acc: any[], t) => {
    const catName = (t.categories as any)?.name || 'Outros';
    const existing = acc.find(c => c.name === catName);
    if (existing) {
      existing.value += Math.abs(Number(t.amount));
    } else {
      acc.push({ name: catName, value: Math.abs(Number(t.amount)) });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  // Recent transactions (combined)
  const recentTransactions = [...filteredDespesas.slice(0, 5), ...filteredReceitas.slice(0, 5)]
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
    .slice(0, 6);

  const monthLabel = referenceMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const hasAlerts = alertStats.overdueCount > 0 || alertStats.pendingCount > 0 || alertStats.invoicesCount > 0;

  if (isLoadingDespesas || isLoadingReceitas) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Compact Alerts - Only show if there are alerts */}
      {hasAlerts && (
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {alertStats.overdueCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 border-destructive/30 bg-destructive/5 hover:bg-destructive/10 text-destructive text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
              onClick={() => onNavigateToTransactions?.('overdue')}
            >
              <AlertTriangle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{alertStats.overdueCount} atrasada(s)</span>
              <span className="sm:hidden">{alertStats.overdueCount}</span>
              <span className="font-semibold hidden xs:inline">
                {alertStats.overdueAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <ChevronRightIcon className="h-3 w-3" />
            </Button>
          )}
          
          {alertStats.pendingCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 text-amber-600 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
              onClick={() => onNavigateToTransactions?.('pending')}
            >
              <CalendarClock className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{alertStats.pendingCount} vencendo</span>
              <span className="sm:hidden">{alertStats.pendingCount}</span>
              <span className="font-semibold hidden xs:inline">
                {alertStats.pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <ChevronRightIcon className="h-3 w-3" />
            </Button>
          )}
          
          {alertStats.invoicesCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1 sm:gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10 text-xs sm:text-sm h-7 sm:h-8 px-2 sm:px-3"
              onClick={onNavigateToCartoes}
            >
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{alertStats.invoicesCount} fatura(s)</span>
              <span className="sm:hidden">{alertStats.invoicesCount}</span>
              <span className="font-semibold hidden xs:inline">
                {alertStats.invoicesAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <ChevronRightIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Month Navigation */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={handlePrevMonth}>
          <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
        <span className="text-sm sm:text-lg font-medium capitalize min-w-[120px] sm:min-w-[160px] text-center">
          {monthLabel}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={handleNextMonth}>
          <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Receitas</p>
                <p className="text-base sm:text-xl font-bold text-emerald-600 truncate">
                  {totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                <ArrowUpRight className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Despesas</p>
                <p className="text-base sm:text-xl font-bold text-destructive truncate">
                  {totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <ArrowDownRight className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          isPositive ? "ring-1 ring-emerald-200 dark:ring-emerald-800" : "ring-1 ring-red-200 dark:ring-red-800"
        )}>
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Resultado</p>
                <p className={cn(
                  "text-base sm:text-xl font-bold truncate",
                  isPositive ? "text-emerald-600" : "text-destructive"
                )}>
                  {resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <div className={cn(
                "h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center flex-shrink-0",
                isPositive ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
              )}>
                <Wallet className={cn(
                  "h-4 w-4 sm:h-5 sm:w-5",
                  isPositive ? "text-emerald-600" : "text-destructive"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={onNavigateToCartoes}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="space-y-0.5 sm:space-y-1 min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide">Cartões</p>
                <p className="text-base sm:text-xl font-bold truncate">
                  {totalFaturas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">
                  {faturasPendentes.length} faturas
                </p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Evolution Chart + Health Gauge Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <EvolutionChart data={evolutionData} />
        <HealthGauge
          receitas={totalReceitas}
          despesas={totalDespesas}
          transacoesAtrasadas={alertStats.overdueCount}
          faturasAbertas={alertStats.invoicesCount}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Bar Chart - Receitas vs Despesas */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Resultado do Mês</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            <ResponsiveContainer width="100%" height={160} className="sm:!h-[200px]">
              <BarChart 
                data={[
                  { name: 'Receitas', value: totalReceitas, fill: '#10b981' },
                  { name: 'Despesas', value: totalDespesas, fill: '#ef4444' }
                ]} 
                margin={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={10} />
                <YAxis hide />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), '']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    fontSize: '11px'
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={60} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart - Despesas por Categoria */}
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Despesas por Categoria</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0">
            {despesasPorCategoria.length > 0 ? (
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-3 sm:gap-4">
                <ResponsiveContainer width={120} height={120} className="sm:!w-[160px] sm:!h-[160px] flex-shrink-0">
                  <PieChart>
                    <Pie
                      data={despesasPorCategoria.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={30}
                      outerRadius={55}
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
                        fontSize: '11px'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-1.5 sm:space-y-2 w-full sm:pt-2">
                  {despesasPorCategoria.slice(0, 4).map((cat, index) => (
                    <div key={cat.name} className="flex items-center justify-between text-xs sm:text-sm">
                      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                        <div 
                          className="h-2 w-2 sm:h-2.5 sm:w-2.5 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-muted-foreground truncate">{cat.name}</span>
                      </div>
                      <span className="font-medium tabular-nums flex-shrink-0 ml-2">
                        {cat.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[120px] sm:h-[160px] flex items-center justify-center text-xs sm:text-sm text-muted-foreground">
                Nenhuma despesa no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="p-3 sm:p-6 pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-xs sm:text-sm font-medium">Transações Recentes</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-[10px] sm:text-xs text-muted-foreground h-6 sm:h-8 px-2"
            onClick={() => onNavigateToTransactions?.('all')}
          >
            Ver todas
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentTransactions.length > 0 ? (
            <div className="divide-y">
              {recentTransactions.map((t) => {
                const isPagar = t.tipo === 'PAGAR';
                return (
                  <div key={t.id} className="flex items-center justify-between px-3 sm:px-6 py-2 sm:py-3 hover:bg-muted/30 transition-colors gap-2">
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "h-6 w-6 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shrink-0",
                        isPagar ? "bg-red-100 dark:bg-red-900/30" : "bg-emerald-100 dark:bg-emerald-900/30"
                      )}>
                        {isPagar 
                          ? <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-destructive" />
                          : <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-emerald-600" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium truncate">{t.description || 'Sem descrição'}</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                          {new Date(t.due_date).toLocaleDateString('pt-BR')} • {(t.categories as any)?.name || 'Sem categoria'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                      <Badge 
                        variant={t.status === 'PAGO' ? 'default' : 'secondary'}
                        className="text-[10px] sm:text-xs h-5 sm:h-6 hidden xs:flex"
                      >
                        {t.status === 'PAGO' ? 'Pago' : 'Pend'}
                      </Badge>
                      <span className={cn(
                        "text-xs sm:text-sm font-semibold tabular-nums",
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
