import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { useTransacoes } from '@/hooks/useTransacoes';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar,
  ArrowRightLeft,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building2
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
  ResponsiveContainer
} from 'recharts';
import { cn } from '@/lib/utils';

// Colors similar to Seu Dinheiro
const CATEGORY_COLORS = [
  '#10b981', // emerald
  '#6366f1', // indigo
  '#f59e0b', // amber
  '#ec4899', // pink
  '#f97316', // orange
  '#6b7280', // gray
  '#14b8a6', // teal
  '#8b5cf6', // violet
];

export function DashboardFinanceiro() {
  const [referenceMonth, setReferenceMonth] = useState(new Date());
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  
  const monthStr = referenceMonth.toISOString().slice(0, 7);
  
  const { dashboardData, isLoading } = useFinanceiro('LOJA', monthStr);
  const { transacoes: despesas, isLoading: isLoadingDespesas } = useTransacoes('LOJA', 'PAGAR');
  const { transacoes: receitas, isLoading: isLoadingReceitas } = useTransacoes('LOJA', 'RECEBER');

  // Navigate months
  const handlePrevMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Filter transactions for current month
  const filterByMonth = (items: any[]) => {
    return items?.filter(t => {
      const transMonth = t.due_date?.slice(0, 7);
      return transMonth === monthStr;
    }) || [];
  };

  const filteredDespesas = filterByMonth(despesas);
  const filteredReceitas = filterByMonth(receitas);

  // Apply status filter
  const applyStatusFilter = (items: any[]) => {
    if (statusFilter.length === 0) return items;
    return items.filter(t => {
      if (statusFilter.includes('PENDENTE') && t.status === 'PREVISTO') return true;
      if (statusFilter.includes('CONFIRMADO') && t.status === 'PAGO') return true;
      if (statusFilter.includes('ATRASADO') && t.status === 'ATRASADO') return true;
      return false;
    });
  };

  const displayedDespesas = applyStatusFilter(filteredDespesas);
  const displayedReceitas = applyStatusFilter(filteredReceitas);

  // Totals
  const totalDespesas = filteredDespesas.reduce((acc, t) => acc + Number(t.amount), 0);
  const totalReceitas = filteredReceitas.reduce((acc, t) => acc + Number(t.amount), 0);
  const resultado = totalReceitas - totalDespesas;

  // Group expenses by category for charts
  const despesasPorCategoria = filteredDespesas.reduce((acc: any[], t) => {
    const catName = (t.categories as any)?.name || 'Sem categoria';
    const existing = acc.find(c => c.name === catName);
    if (existing) {
      existing.value += Number(t.amount);
    } else {
      acc.push({ name: catName, value: Number(t.amount) });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  const receitasPorCategoria = filteredReceitas.reduce((acc: any[], t) => {
    const catName = (t.categories as any)?.name || 'Sem categoria';
    const existing = acc.find(c => c.name === catName);
    if (existing) {
      existing.value += Number(t.amount);
    } else {
      acc.push({ name: catName, value: Number(t.amount) });
    }
    return acc;
  }, []).sort((a, b) => b.value - a.value);

  // Toggle status filter
  const toggleFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  const monthLabel = referenceMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  if (isLoading || isLoadingDespesas || isLoadingReceitas) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Carregando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Month Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Month Navigator */}
        <div className="flex items-center gap-2 bg-background/80 border border-border/50 rounded-lg px-2 py-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 min-w-[180px] justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium capitalize">{monthLabel}</span>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-muted-foreground mr-1">Filtrar:</span>
          <button
            onClick={() => toggleFilter('PENDENTE')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              statusFilter.includes('PENDENTE')
                ? "bg-amber-500/20 border-amber-500/50 text-amber-700 dark:text-amber-400"
                : "bg-background border-border/50 text-muted-foreground hover:border-amber-500/50"
            )}
          >
            <Clock className="h-3 w-3" />
            Pendentes
          </button>
          <button
            onClick={() => toggleFilter('CONFIRMADO')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              statusFilter.includes('CONFIRMADO')
                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-700 dark:text-emerald-400"
                : "bg-background border-border/50 text-muted-foreground hover:border-emerald-500/50"
            )}
          >
            <CheckCircle2 className="h-3 w-3" />
            Confirmados
          </button>
          <button
            onClick={() => toggleFilter('ATRASADO')}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all border",
              statusFilter.includes('ATRASADO')
                ? "bg-destructive/20 border-destructive/50 text-destructive"
                : "bg-background border-border/50 text-muted-foreground hover:border-destructive/50"
            )}
          >
            <AlertCircle className="h-3 w-3" />
            Atrasados
          </button>
        </div>
      </div>

      {/* Main Layout: Sidebar + Content */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        {/* Left Sidebar - Summary */}
        <div className="space-y-4">
          {/* Financial Summary Card */}
          <Card className="glass-card">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Receitas</span>
                <span className="font-semibold text-emerald-600">
                  R$ {totalReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Despesas</span>
                <span className="font-semibold text-destructive">
                  -R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="border-t pt-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total</span>
                  <span className={cn(
                    "font-bold text-lg",
                    resultado >= 0 ? "text-emerald-600" : "text-destructive"
                  )}>
                    {resultado >= 0 ? '' : '-'}R$ {Math.abs(resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Entity Badge */}
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/5 border border-primary/20">
            <Building2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Loja</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="xl:col-span-3 space-y-6">
          {/* Result Chart + Pie Chart Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar Chart - Result do Mês */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Resultado do mês</h3>
                  <span className="text-xs text-muted-foreground">Situação projetada</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={[
                    { name: 'Receitas', value: totalReceitas, fill: '#10b981' },
                    { name: 'Despesas', value: totalDespesas, fill: '#ef4444' }
                  ]} margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                    <YAxis hide />
                    <Tooltip 
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar dataKey="value" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="flex items-center justify-between mt-2 pt-2 border-t">
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
                      <span>Receitas</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="h-2.5 w-2.5 rounded-sm bg-destructive" />
                      <span>Despesas</span>
                    </div>
                  </div>
                  <div className={cn(
                    "text-sm font-semibold",
                    resultado >= 0 ? "text-emerald-600" : "text-destructive"
                  )}>
                    Resultado: {resultado >= 0 ? '' : '-'}R$ {Math.abs(resultado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Pie Chart - Despesas por Categoria */}
            <Card className="glass-card">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium">Despesas por categoria</h3>
                  <span className="text-xs text-muted-foreground">Situação projetada</span>
                </div>
                {despesasPorCategoria.length > 0 ? (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width="40%" height={180}>
                      <PieChart>
                        <Pie
                          data={despesasPorCategoria}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          paddingAngle={2}
                          dataKey="value"
                        >
                          {despesasPorCategoria.map((_, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                            />
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
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5 max-h-[180px] overflow-y-auto">
                      {despesasPorCategoria.slice(0, 6).map((cat, index) => {
                        const percentage = ((cat.value / totalDespesas) * 100).toFixed(1);
                        return (
                          <div key={cat.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div 
                                className="h-2.5 w-2.5 rounded-full shrink-0" 
                                style={{ backgroundColor: CATEGORY_COLORS[index % CATEGORY_COLORS.length] }}
                              />
                              <span className="truncate text-muted-foreground">{cat.name}</span>
                              <span className="text-muted-foreground/60">{percentage}%</span>
                            </div>
                            <span className="font-medium text-destructive shrink-0 ml-2">
                              -R$ {cat.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
                    Nenhuma despesa no período
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Transactions Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Contas a Pagar */}
            <Card className="glass-card">
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <h3 className="font-medium text-sm">Contas a pagar</h3>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {displayedDespesas.length > 0 ? (
                    <div className="divide-y">
                      {displayedDespesas.slice(0, 10).map((t) => (
                        <TransactionRow 
                          key={t.id} 
                          transaction={t} 
                          tipo="PAGAR"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Nenhuma conta a pagar
                    </div>
                  )}
                </div>
                {displayedDespesas.length > 0 && (
                  <div className="p-3 border-t bg-muted/30 flex items-center justify-between">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-bold text-destructive">
                      -R$ {displayedDespesas.reduce((acc, t) => acc + Number(t.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Contas a Receber */}
            <Card className="glass-card">
              <CardContent className="p-0">
                <div className="p-4 border-b">
                  <h3 className="font-medium text-sm">Contas a receber</h3>
                </div>
                <div className="max-h-[320px] overflow-y-auto">
                  {displayedReceitas.length > 0 ? (
                    <div className="divide-y">
                      {displayedReceitas.slice(0, 10).map((t) => (
                        <TransactionRow 
                          key={t.id} 
                          transaction={t} 
                          tipo="RECEBER"
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      Nenhuma conta a receber
                    </div>
                  )}
                </div>
                {displayedReceitas.length > 0 && (
                  <div className="p-3 border-t bg-muted/30 flex items-center justify-between">
                    <span className="text-sm font-medium">Total</span>
                    <span className="text-sm font-bold text-emerald-600">
                      R$ {displayedReceitas.reduce((acc, t) => acc + Number(t.amount), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

// Transaction Row Component
function TransactionRow({ transaction, tipo }: { transaction: any; tipo: 'PAGAR' | 'RECEBER' }) {
  const isPago = transaction.status === 'PAGO';
  const isAtrasado = transaction.status === 'ATRASADO' || 
    (transaction.status === 'PREVISTO' && new Date(transaction.due_date) < new Date());
  
  const accountName = (transaction.accounts as any)?.name;
  
  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors",
      isAtrasado && "bg-destructive/5"
    )}>
      {/* Status Indicator */}
      <div className={cn(
        "h-2.5 w-2.5 rounded-full shrink-0",
        isPago ? "bg-emerald-500" : isAtrasado ? "bg-destructive" : "bg-amber-500"
      )} />
      
      {/* Date */}
      <div className="w-16 shrink-0 text-xs text-muted-foreground">
        {new Date(transaction.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
      </div>
      
      {/* Description & Account */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{transaction.description || 'Sem descrição'}</p>
        {accountName && (
          <div className="flex items-center gap-1 mt-0.5">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
              {accountName}
            </Badge>
            {transaction.notes && (
              <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">
                {transaction.notes}
              </span>
            )}
          </div>
        )}
      </div>
      
      {/* Transfer Icon if applicable */}
      {transaction.origin === 'RECORRENTE' && (
        <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      )}
      
      {/* Value */}
      <div className={cn(
        "text-sm font-semibold shrink-0",
        tipo === 'RECEBER' ? "text-emerald-600" : "text-destructive"
      )}>
        {tipo === 'PAGAR' ? '-' : ''}R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
      </div>
    </div>
  );
}
