import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCartoes } from '@/hooks/useCartoes';
import { useFinanceiroStats } from '@/hooks/useFinanceiroStats';
import { HealthGauge } from './HealthGauge';
import { EvolutionChart } from './EvolutionChart';
import type { TransactionFilter } from '@/pages/Financeiro';
import { 
  ChevronLeft, 
  ChevronRight, 
  TrendingUp,
  TrendingDown,
  Wallet,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CalendarClock,
  ChevronRight as ChevronRightIcon,
  Sparkles,
  BarChart3,
  PieChart as PieChartIcon,
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
  const lastDayOfMonth = new Date(referenceMonth.getFullYear(), referenceMonth.getMonth() + 1, 0).toISOString().slice(0, 10);
  
  // Fetch ALL transactions (not filtered by entity)
  const { data: allTransactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['all-transactions', monthStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, categories(name, group)')
        .gte('due_date', `${monthStr}-01`)
        .lte('due_date', lastDayOfMonth);
      if (error) throw error;
      return data;
    }
  });

  // Fetch credit card transactions for the month
  const { data: cardTransactions, isLoading: isLoadingCards } = useQuery({
    queryKey: ['card-transactions-dashboard', monthStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select('*')
        .gte('competencia', `${monthStr}-01`)
        .lte('competencia', lastDayOfMonth);
      if (error) throw error;
      return data;
    }
  });

  const { faturas } = useCartoes();
  const { evolutionData, alertStats, isLoading: isLoadingStats } = useFinanceiroStats(referenceMonth);

  const handlePrevMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Calculate totals from bank transactions
  const bankDespesas = allTransactions?.filter(t => t.tipo === 'PAGAR').reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0;
  const bankReceitas = allTransactions?.filter(t => t.tipo === 'RECEBER').reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0;
  
  // Add credit card transactions to expenses
  const cardDespesas = cardTransactions?.reduce((acc, t) => acc + Math.abs(Number(t.amount)), 0) || 0;
  
  const totalDespesas = bankDespesas + cardDespesas;
  const totalReceitas = bankReceitas;
  const resultado = totalReceitas - totalDespesas;
  const isPositive = resultado >= 0;

  const faturasPendentes = faturas?.filter(f => f.status !== 'PAGA').slice(0, 3) || [];
  const totalFaturas = faturasPendentes.reduce((acc, f) => acc + f.total_value, 0);

  // All expenses for category breakdown (bank + cards combined into bank with category)
  const allDespesas = allTransactions?.filter(t => t.tipo === 'PAGAR') || [];
  
  const despesasPorCategoria = allDespesas.reduce((acc: any[], t) => {
    const catName = (t.categories as any)?.name || 'Outros';
    const existing = acc.find(c => c.name === catName);
    if (existing) {
      existing.value += Math.abs(Number(t.amount));
    } else {
      acc.push({ name: catName, value: Math.abs(Number(t.amount)) });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  // Recent transactions (most recent 6)
  const recentTransactions = (allTransactions || [])
    .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
    .slice(0, 6);

  const monthLabel = referenceMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  const hasAlerts = alertStats.overdueCount > 0 || alertStats.pendingCount > 0 || alertStats.invoicesCount > 0;

  if (isLoadingTransactions || isLoadingCards) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alerts Strip */}
      {hasAlerts && (
        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-muted/30 border border-border/50">
          {alertStats.overdueCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 bg-destructive/10 hover:bg-destructive/20 text-destructive border-0 h-9"
              onClick={() => onNavigateToTransactions?.('overdue')}
            >
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">{alertStats.overdueCount} atrasada(s)</span>
              <span className="text-xs opacity-75">
                {alertStats.overdueAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <ChevronRightIcon className="h-3 w-3" />
            </Button>
          )}
          
          {alertStats.pendingCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-0 h-9"
              onClick={() => onNavigateToTransactions?.('pending')}
            >
              <CalendarClock className="h-4 w-4" />
              <span className="font-medium">{alertStats.pendingCount} vencendo</span>
              <span className="text-xs opacity-75">
                {alertStats.pendingAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <ChevronRightIcon className="h-3 w-3" />
            </Button>
          )}
          
          {alertStats.invoicesCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-0 h-9"
              onClick={onNavigateToCartoes}
            >
              <CreditCard className="h-4 w-4" />
              <span className="font-medium">{alertStats.invoicesCount} fatura(s)</span>
              <span className="text-xs opacity-75">
                {alertStats.invoicesAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <ChevronRightIcon className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Month Navigator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 bg-muted/50 rounded-xl p-1">
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium capitalize px-3 min-w-[140px] text-center">
            {monthLabel}
          </span>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Hero KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receitas */}
        <Card className="relative overflow-hidden group hover:shadow-lg hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
          <CardContent className="relative p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Receitas</p>
                <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                  <span>Entradas do mês</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <ArrowUpRight className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Despesas */}
        <Card className="relative overflow-hidden group hover:shadow-lg hover:shadow-destructive/5 transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-destructive/10 via-transparent to-transparent" />
          <CardContent className="relative p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Despesas</p>
                <p className="text-2xl font-bold text-destructive tracking-tight">
                  {totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <TrendingDown className="h-3 w-3 text-destructive" />
                  <span>Saídas do mês</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-destructive/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <ArrowDownRight className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        <Card className={cn(
          "relative overflow-hidden group transition-all duration-300",
          isPositive 
            ? "hover:shadow-lg hover:shadow-emerald-500/10 ring-1 ring-emerald-500/20" 
            : "hover:shadow-lg hover:shadow-destructive/10 ring-1 ring-destructive/20"
        )}>
          <div className={cn(
            "absolute inset-0 bg-gradient-to-br via-transparent to-transparent",
            isPositive ? "from-emerald-500/10" : "from-destructive/10"
          )} />
          <CardContent className="relative p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Resultado</p>
                  {isPositive && <Sparkles className="h-3 w-3 text-emerald-500" />}
                </div>
                <p className={cn(
                  "text-2xl font-bold tracking-tight",
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                )}>
                  {resultado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{isPositive ? 'Saldo positivo' : 'Saldo negativo'}</span>
                </div>
              </div>
              <div className={cn(
                "h-12 w-12 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300",
                isPositive ? "bg-emerald-500/20" : "bg-destructive/20"
              )}>
                <Wallet className={cn(
                  "h-6 w-6",
                  isPositive ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
                )} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cartões */}
        <Card 
          className="relative overflow-hidden group hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 cursor-pointer"
          onClick={onNavigateToCartoes}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent" />
          <CardContent className="relative p-5">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Cartões</p>
                <p className="text-2xl font-bold tracking-tight">
                  {totalFaturas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <span>{faturasPendentes.length} faturas pendentes</span>
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-primary/20 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                <CreditCard className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <EvolutionChart data={evolutionData} />
        <HealthGauge
          receitas={totalReceitas}
          despesas={totalDespesas}
          transacoesAtrasadas={alertStats.overdueCount}
          faturasAbertas={alertStats.invoicesCount}
        />
      </div>

      {/* Secondary Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bar Chart */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Comparativo do Mês</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart 
                data={[
                  { name: 'Receitas', value: totalReceitas, fill: 'hsl(var(--success))' },
                  { name: 'Despesas', value: totalDespesas, fill: 'hsl(var(--destructive))' }
                ]} 
                margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  fontSize={12} 
                  tick={{ fill: 'hsl(var(--foreground))' }}
                />
                <YAxis hide />
                <Tooltip 
                  formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), '']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                    color: 'hsl(var(--popover-foreground))'
                  }}
                  labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                  itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]} maxBarSize={80} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Pie Chart */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-medium">Despesas por Categoria</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {despesasPorCategoria.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width={140} height={140}>
                  <PieChart>
                    <Pie
                      data={despesasPorCategoria.slice(0, 6)}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={65}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {despesasPorCategoria.slice(0, 6).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), '']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--popover))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        color: 'hsl(var(--popover-foreground))'
                      }}
                      labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                      itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2.5">
                  {despesasPorCategoria.slice(0, 5).map((cat, index) => (
                    <div key={cat.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div 
                          className="h-3 w-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-muted-foreground truncate text-xs">{cat.name}</span>
                      </div>
                      <span className="font-medium tabular-nums text-xs">
                        {cat.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-[140px] flex items-center justify-center text-sm text-muted-foreground">
                Nenhuma despesa no período
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Transações Recentes</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-xs text-muted-foreground h-8"
            onClick={() => onNavigateToTransactions?.('all')}
          >
            Ver todas
            <ChevronRightIcon className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {recentTransactions.length > 0 ? (
            <div className="divide-y divide-border/50">
              {recentTransactions.map((t) => {
                const isPagar = t.tipo === 'PAGAR';
                return (
                  <div key={t.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-muted/30 transition-colors gap-3">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                        isPagar 
                          ? "bg-destructive/10" 
                          : "bg-emerald-500/10"
                      )}>
                        {isPagar 
                          ? <ArrowDownRight className="h-5 w-5 text-destructive" />
                          : <ArrowUpRight className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        }
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{t.description || 'Sem descrição'}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {new Date(t.due_date).toLocaleDateString('pt-BR')} • {(t.categories as any)?.name || 'Sem categoria'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <Badge 
                        variant={t.status === 'PAGO' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {t.status === 'PAGO' ? 'Pago' : 'Pendente'}
                      </Badge>
                      <span className={cn(
                        "text-sm font-bold tabular-nums",
                        isPagar ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                      )}>
                        {isPagar ? '-' : '+'}
                        {Math.abs(Number(t.amount)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center">
              <div className="h-12 w-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">Nenhuma transação no período</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Import at top for empty state
import { ArrowLeftRight } from 'lucide-react';
