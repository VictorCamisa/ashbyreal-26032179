import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { 
  Repeat, 
  CalendarDays, 
  TrendingUp, 
  PauseCircle, 
  PlayCircle, 
  Edit2, 
  Trash2,
  Plus,
  DollarSign,
  Calendar
} from 'lucide-react';
import { RecurringExpense } from '@/hooks/useRecurringExpenses';

interface DespesasFixasAnalyticsProps {
  expenses: RecurringExpense[];
  onAddNew: () => void;
  onEdit: (expense: RecurringExpense) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onDelete: (id: string) => void;
}

const PALETTE = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

function currencyFmt(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function currencyShort(val: number) {
  if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`;
  return currencyFmt(val);
}

export function DespesasFixasAnalytics({
  expenses,
  onAddNew,
  onEdit,
  onToggleActive,
  onDelete
}: DespesasFixasAnalyticsProps) {
  const [horizon, setHorizon] = useState<'dezembro' | 'ultimo'>('dezembro');
  const [activeTab, setActiveTab] = useState<'lista' | 'projecao' | 'consolidado'>('lista');

  const activeExpenses = expenses.filter(e => e.is_active);
  const inactiveExpenses = expenses.filter(e => !e.is_active);

  // Calculate months for projection
  const monthsFromNow = useMemo(() => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const months: Date[] = [];

    if (horizon === 'dezembro') {
      // Until December of current year
      for (let m = now.getMonth(); m <= 11; m++) {
        months.push(new Date(currentYear, m, 1));
      }
    } else {
      // Until last end_date or 12 months
      const endDates = expenses
        .filter(e => e.end_date && e.is_active)
        .map(e => new Date(e.end_date!));
      
      const maxEnd = endDates.length > 0 
        ? new Date(Math.max(...endDates.map(d => d.getTime())))
        : new Date(currentYear, now.getMonth() + 11, 1);

      let current = new Date(currentYear, now.getMonth(), 1);
      while (current <= maxEnd) {
        months.push(new Date(current));
        current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
      }
    }

    return months;
  }, [horizon, expenses]);

  // Calculate projection for each expense
  const expenseProjections = useMemo(() => {
    return activeExpenses.map(expense => {
      const startDate = new Date(expense.start_date);
      const endDate = expense.end_date ? new Date(expense.end_date) : null;

      const monthlyValues = monthsFromNow.map(month => {
        // Check if expense is active in this month
        if (month < startDate) return 0;
        if (endDate && month > endDate) return 0;
        
        if (expense.frequency === 'MENSAL') {
          return expense.amount;
        } else if (expense.frequency === 'ANUAL') {
          // Only in the month matching start_date month
          if (month.getMonth() === startDate.getMonth()) {
            return expense.amount;
          }
          return 0;
        }
        // SEMANAL - approximate 4 times per month
        return expense.amount * 4;
      });

      const total = monthlyValues.reduce((a, b) => a + b, 0);

      return {
        expense,
        monthlyValues,
        total
      };
    });
  }, [activeExpenses, monthsFromNow]);

  // Totals
  const totals = useMemo(() => {
    const monthlyTotal = activeExpenses
      .filter(e => e.frequency === 'MENSAL')
      .reduce((sum, e) => sum + e.amount, 0);

    const projectionTotal = expenseProjections.reduce((sum, p) => sum + p.total, 0);

    const biggest = activeExpenses.length > 0
      ? activeExpenses.reduce((max, e) => e.amount > max.amount ? e : max, activeExpenses[0])
      : null;

    return { monthlyTotal, projectionTotal, biggest };
  }, [activeExpenses, expenseProjections]);

  // Monthly totals for projection grid
  const monthlyTotals = useMemo(() => {
    return monthsFromNow.map((_, idx) => 
      expenseProjections.reduce((sum, p) => sum + p.monthlyValues[idx], 0)
    );
  }, [expenseProjections, monthsFromNow]);

  const maxProjection = Math.max(...expenseProjections.map(p => p.total), 1);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Select value={horizon} onValueChange={(v: 'dezembro' | 'ultimo') => setHorizon(v)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dezembro">Projeção até Dezembro</SelectItem>
              <SelectItem value="ultimo">Até última vigência</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={onAddNew} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Despesa Fixa
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <DollarSign className="h-4 w-4" />
              Total Mensal
            </div>
            <p className="text-2xl font-bold mt-1">{currencyFmt(totals.monthlyTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{activeExpenses.length} despesas ativas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <TrendingUp className="h-4 w-4" />
              Projeção Total
            </div>
            <p className="text-2xl font-bold mt-1">{currencyShort(totals.projectionTotal)}</p>
            <p className="text-xs text-muted-foreground mt-1">{monthsFromNow.length} meses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Repeat className="h-4 w-4" />
              Despesas Ativas
            </div>
            <p className="text-2xl font-bold mt-1">{activeExpenses.length}</p>
            <p className="text-xs text-muted-foreground mt-1">{inactiveExpenses.length} pausadas</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-chart-4/10 to-chart-4/5">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Calendar className="h-4 w-4" />
              Maior Despesa
            </div>
            <p className="text-2xl font-bold mt-1">
              {totals.biggest ? currencyFmt(totals.biggest.amount) : '-'}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">
              {totals.biggest?.description || '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="lista">Lista de Despesas</TabsTrigger>
          <TabsTrigger value="projecao">Projeção Mensal</TabsTrigger>
          <TabsTrigger value="consolidado">Ranking</TabsTrigger>
        </TabsList>

        {/* Lista */}
        <TabsContent value="lista" className="space-y-4">
          {activeExpenses.length === 0 && inactiveExpenses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Repeat className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma despesa fixa cadastrada</p>
                <Button onClick={onAddNew} className="mt-4" variant="outline">
                  Cadastrar primeira despesa
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {activeExpenses.map((expense, idx) => (
                <Card key={expense.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div 
                          className="w-3 h-12 rounded-full"
                          style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                        />
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays className="h-3 w-3" />
                            Dia {expense.day_of_month}
                            <span>•</span>
                            <Badge variant="secondary" className="text-xs">
                              {expense.frequency}
                            </Badge>
                            {expense.categories && (
                              <>
                                <span>•</span>
                                <span>{expense.categories.name}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">{currencyFmt(expense.amount)}</p>
                          {expense.end_date && (
                            <p className="text-xs text-muted-foreground">
                              até {new Date(expense.end_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                            </p>
                          )}
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onToggleActive(expense.id, false)}
                            title="Pausar"
                          >
                            <PauseCircle className="h-4 w-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(expense)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onDelete(expense.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Inactive expenses */}
              {inactiveExpenses.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-muted-foreground mb-3">Despesas Pausadas</p>
                  {inactiveExpenses.map((expense) => (
                    <Card key={expense.id} className="opacity-60">
                      <CardContent className="py-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <PauseCircle className="h-4 w-4 text-muted-foreground" />
                            <span className="line-through">{expense.description}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground">{currencyFmt(expense.amount)}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onToggleActive(expense.id, true)}
                              title="Reativar"
                            >
                              <PlayCircle className="h-4 w-4 text-green-500" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Projeção Mensal */}
        <TabsContent value="projecao">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Próximos Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expenseProjections.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma despesa fixa ativa
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-2 font-medium sticky left-0 bg-card z-10">Despesa</th>
                        {monthsFromNow.map((month, idx) => (
                          <th key={idx} className="text-center py-2 px-3 font-medium min-w-[80px]">
                            <div className="capitalize">
                              {month.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {month.toLocaleDateString('pt-BR', { year: '2-digit' })}
                            </div>
                          </th>
                        ))}
                        <th className="text-right py-2 px-2 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expenseProjections.map((proj, idx) => (
                        <tr key={proj.expense.id} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-2 sticky left-0 bg-card z-10">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: PALETTE[idx % PALETTE.length] }}
                              />
                              <span className="truncate max-w-[150px]">{proj.expense.description}</span>
                            </div>
                          </td>
                          {proj.monthlyValues.map((val, mIdx) => (
                            <td key={mIdx} className="text-center py-3 px-3">
                              {val > 0 ? (
                                <span className="text-foreground">{currencyShort(val)}</span>
                              ) : (
                                <span className="text-muted-foreground/30">-</span>
                              )}
                            </td>
                          ))}
                          <td className="text-right py-3 px-2 font-medium">
                            {currencyShort(proj.total)}
                          </td>
                        </tr>
                      ))}
                      {/* Totals row */}
                      <tr className="bg-muted/50 font-medium">
                        <td className="py-3 px-2 sticky left-0 bg-muted/50 z-10">TOTAL</td>
                        {monthlyTotals.map((total, idx) => (
                          <td key={idx} className="text-center py-3 px-3">
                            {currencyShort(total)}
                          </td>
                        ))}
                        <td className="text-right py-3 px-2">
                          {currencyShort(totals.projectionTotal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ranking */}
        <TabsContent value="consolidado">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ranking por Projeção</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {expenseProjections
                .sort((a, b) => b.total - a.total)
                .map((proj, idx) => (
                  <div key={proj.expense.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-muted-foreground w-6">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="font-medium">{proj.expense.description}</p>
                          <p className="text-xs text-muted-foreground">
                            {currencyFmt(proj.expense.amount)}/mês
                            {proj.expense.end_date && (
                              <> • até {new Date(proj.expense.end_date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{currencyFmt(proj.total)}</p>
                        <p className="text-xs text-muted-foreground">
                          {((proj.total / totals.projectionTotal) * 100).toFixed(0)}% do total
                        </p>
                      </div>
                    </div>
                    <Progress 
                      value={(proj.total / maxProjection) * 100}
                      className="h-2"
                    />
                  </div>
                ))}

              {expenseProjections.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  Nenhuma despesa fixa ativa
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
