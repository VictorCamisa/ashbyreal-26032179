import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronLeft, 
  ChevronRight, 
  ArrowUpCircle, 
  ArrowDownCircle 
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday,
  getDay,
  addMonths,
  subMonths
} from 'date-fns';
import { formatMonthYear, formatDayMonth } from '@/lib/dateUtils';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Transaction {
  id: string;
  description: string | null;
  amount: string | number;
  due_date: string;
  tipo: 'PAGAR' | 'RECEBER';
  status: string;
  categories?: { name: string } | null;
}

interface CalendarioFinanceiroProps {
  transactions: Transaction[];
  referenceMonth: Date;
  onMonthChange: (date: Date) => void;
  onTransactionClick?: (transaction: Transaction) => void;
}

export function CalendarioFinanceiro({ 
  transactions, 
  referenceMonth, 
  onMonthChange,
  onTransactionClick 
}: CalendarioFinanceiroProps) {
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  const monthStart = startOfMonth(referenceMonth);
  const monthEnd = endOfMonth(referenceMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  // Get day offset for first day of month (0 = Sunday, 6 = Saturday)
  const startDayOffset = getDay(monthStart);

  // Group transactions by date
  const transactionsByDate = useMemo(() => {
    const grouped: Record<string, Transaction[]> = {};
    transactions.forEach(t => {
      const dateKey = t.due_date.slice(0, 10);
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(t);
    });
    return grouped;
  }, [transactions]);

  // Calculate totals for each day
  const getDayTotals = (date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const dayTransactions = transactionsByDate[dateKey] || [];
    
    const receitas = dayTransactions
      .filter(t => t.tipo === 'RECEBER')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    const despesas = dayTransactions
      .filter(t => t.tipo === 'PAGAR')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    return { receitas, despesas, transactions: dayTransactions };
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const handlePrevMonth = () => {
    onMonthChange(subMonths(referenceMonth, 1));
  };

  const handleNextMonth = () => {
    onMonthChange(addMonths(referenceMonth, 1));
  };

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Calendário Financeiro</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {formatMonthYear(referenceMonth)}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map(day => (
            <div 
              key={day} 
              className="text-xs font-medium text-muted-foreground text-center py-1"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Empty cells for days before month start */}
          {Array.from({ length: startDayOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}

          {/* Day cells */}
          {daysInMonth.map(day => {
            const { receitas, despesas, transactions: dayTransactions } = getDayTotals(day);
            const hasTransactions = dayTransactions.length > 0;
            const isSelected = selectedDay && isSameDay(day, selectedDay);

            return (
              <Popover key={day.toISOString()}>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "aspect-square p-1 rounded-lg text-left transition-all hover:bg-muted/50 relative group",
                      isToday(day) && "ring-1 ring-primary",
                      isSelected && "bg-muted",
                      hasTransactions && "cursor-pointer"
                    )}
                    onClick={() => setSelectedDay(day)}
                  >
                    <span className={cn(
                      "text-xs font-medium",
                      isToday(day) && "text-primary"
                    )}>
                      {format(day, 'd')}
                    </span>
                    
                    {hasTransactions && (
                      <div className="absolute bottom-1 left-1 right-1 flex flex-col gap-0.5">
                        {receitas > 0 && (
                          <div className="h-1 rounded-full bg-emerald-500 opacity-80" />
                        )}
                        {despesas > 0 && (
                          <div className="h-1 rounded-full bg-red-500 opacity-80" />
                        )}
                      </div>
                    )}
                  </button>
                </PopoverTrigger>
                
                {hasTransactions && (
                  <PopoverContent className="w-72 p-0" align="start">
                    <div className="p-3 border-b">
                      <p className="font-medium text-sm">
                        {formatDayMonth(day)}
                      </p>
                      <div className="flex items-center gap-4 mt-1 text-xs">
                        {receitas > 0 && (
                          <span className="text-emerald-600">
                            +{formatCurrency(receitas)}
                          </span>
                        )}
                        {despesas > 0 && (
                          <span className="text-destructive">
                            -{formatCurrency(despesas)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto">
                      {dayTransactions.map(t => (
                        <div 
                          key={t.id}
                          className="flex items-center gap-2 px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => onTransactionClick?.(t)}
                        >
                          <div className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                            t.tipo === 'RECEBER' 
                              ? "bg-emerald-100 dark:bg-emerald-900/30" 
                              : "bg-red-100 dark:bg-red-900/30"
                          )}>
                            {t.tipo === 'RECEBER' 
                              ? <ArrowUpCircle className="h-3 w-3 text-emerald-600" />
                              : <ArrowDownCircle className="h-3 w-3 text-destructive" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">
                              {t.description || 'Sem descrição'}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {t.categories?.name || 'Sem categoria'}
                            </p>
                          </div>
                          <span className={cn(
                            "text-xs font-medium",
                            t.tipo === 'RECEBER' ? "text-emerald-600" : "text-destructive"
                          )}>
                            {Number(t.amount).toLocaleString('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                )}
              </Popover>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-4 mt-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded-full bg-emerald-500" />
            <span className="text-muted-foreground">Receitas</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-4 rounded-full bg-red-500" />
            <span className="text-muted-foreground">Despesas</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
