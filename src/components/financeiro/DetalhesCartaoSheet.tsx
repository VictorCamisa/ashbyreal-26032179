import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  Calendar,
  Receipt,
  Search,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetalhesCartaoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartao: any;
}

export function DetalhesCartaoSheet({ open, onOpenChange, cartao }: DetalhesCartaoSheetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [referenceMonth, setReferenceMonth] = useState(new Date());
  const [parcelasFilter, setParcelasFilter] = useState<string>('todas');

  const monthStr = referenceMonth.toISOString().slice(0, 7);
  const monthLabel = format(referenceMonth, 'MMMM yyyy', { locale: ptBR });

  // Fetch transactions for this card
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['card-transactions', cartao?.id, monthStr],
    queryFn: async () => {
      if (!cartao?.id) return [];
      
      const startOfMonth = `${monthStr}-01`;
      const year = referenceMonth.getFullYear();
      const month = referenceMonth.getMonth();
      const startOfNextMonth = new Date(year, month + 1, 1).toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select(`
          *,
          categories(name, group),
          subcategories(name)
        `)
        .eq('credit_card_id', cartao.id)
        .gte('purchase_date', startOfMonth)
        .lt('purchase_date', startOfNextMonth)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!cartao?.id,
  });

  // Fetch invoices for this card
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['card-invoices', cartao?.id],
    queryFn: async () => {
      if (!cartao?.id) return [];

      const { data, error } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('credit_card_id', cartao.id)
        .order('competencia', { ascending: false })
        .limit(12);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!cartao?.id,
  });

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter((t) => {
      const matchesSearch =
        searchTerm === '' ||
        t.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesParcelas =
        parcelasFilter === 'todas' ||
        (parcelasFilter === 'parceladas' && t.total_installments > 1) ||
        (parcelasFilter === 'avista' && t.total_installments <= 1);

      return matchesSearch && matchesParcelas;
    });
  }, [transactions, searchTerm, parcelasFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const total = filteredTransactions.reduce((sum, t) => sum + t.amount, 0);
    const parceladas = filteredTransactions
      .filter((t) => t.total_installments > 1)
      .reduce((sum, t) => sum + t.amount, 0);
    return { total, parceladas, avista: total - parceladas };
  }, [filteredTransactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const handlePrevMonth = () => {
    setReferenceMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
    );
  };

  const handleNextMonth = () => {
    setReferenceMonth(
      (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
    );
  };

  if (!cartao) return null;

  const limitValue = cartao.limit_value || 0;
  const currentInvoice = invoices?.find((inv) =>
    inv.competencia.startsWith(monthStr)
  );
  const currentValue = currentInvoice?.total_value || totals.total;
  const usagePercent = limitValue > 0 ? (currentValue / limitValue) * 100 : 0;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl overflow-hidden flex flex-col">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
              <CreditCard className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <SheetTitle className="text-xl">{cartao.name}</SheetTitle>
              <SheetDescription>
                Venc. dia {cartao.due_day || '-'} • Fecha dia{' '}
                {cartao.closing_day || '-'}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <Tabs defaultValue="transacoes" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2 mt-4">
            <TabsTrigger value="transacoes" className="gap-2">
              <Receipt className="h-4 w-4" />
              Transações
            </TabsTrigger>
            <TabsTrigger value="faturas" className="gap-2">
              <Calendar className="h-4 w-4" />
              Faturas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="transacoes" className="flex-1 flex flex-col overflow-hidden mt-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Card className="glass-card">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Total Mês
                    </span>
                  </div>
                  <p className="text-lg font-bold mt-1">
                    {formatCurrency(totals.total)}
                  </p>
                </CardContent>
              </Card>
              <Card className="glass-card">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Parcelado
                    </span>
                  </div>
                  <p className="text-lg font-bold mt-1">
                    {formatCurrency(totals.parceladas)}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Limit Progress */}
            {limitValue > 0 && (
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Limite usado</span>
                  <span
                    className={cn(
                      'font-medium',
                      usagePercent > 80 && 'text-destructive'
                    )}
                  >
                    {usagePercent.toFixed(0)}%
                  </span>
                </div>
                <Progress
                  value={Math.min(usagePercent, 100)}
                  className={cn(
                    'h-2',
                    usagePercent > 80 && '[&>div]:bg-destructive'
                  )}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatCurrency(currentValue)}</span>
                  <span>{formatCurrency(limitValue)}</span>
                </div>
              </div>
            )}

            {/* Month Navigation + Filters */}
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handlePrevMonth}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium capitalize min-w-[100px] text-center">
                {monthLabel}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleNextMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-9"
                />
              </div>
              <Select value={parcelasFilter} onValueChange={setParcelasFilter}>
                <SelectTrigger className="w-[120px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas</SelectItem>
                  <SelectItem value="parceladas">Parceladas</SelectItem>
                  <SelectItem value="avista">À vista</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Transactions List */}
            <ScrollArea className="flex-1">
              {isLoadingTransactions ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma transação encontrada
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {filteredTransactions.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {t.description || 'Sem descrição'}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(t.purchase_date), 'dd/MM/yyyy')}
                          </span>
                          {t.total_installments > 1 && (
                            <Badge
                              variant="secondary"
                              className="text-xs py-0 h-5"
                            >
                              {t.installment_number}/{t.total_installments}
                            </Badge>
                          )}
                          {t.categories?.name && (
                            <Badge
                              variant="outline"
                              className="text-xs py-0 h-5"
                            >
                              {t.categories.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <span className="text-sm font-semibold text-destructive">
                        {formatCurrency(t.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="faturas" className="flex-1 overflow-hidden mt-4">
            <ScrollArea className="h-full">
              {isLoadingInvoices ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Carregando...
                </div>
              ) : !invoices || invoices.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  Nenhuma fatura encontrada
                </div>
              ) : (
                <div className="space-y-2 pr-4">
                  {invoices.map((inv) => {
                    const isOverdue =
                      inv.due_date &&
                      new Date(inv.due_date) < new Date() &&
                      inv.status !== 'PAGA';

                    return (
                      <div
                        key={inv.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border transition-colors',
                          isOverdue
                            ? 'bg-destructive/5 border-destructive/20'
                            : 'bg-muted/30 border-border/50'
                        )}
                      >
                        <div>
                          <p className="font-medium text-sm">
                            {format(
                              new Date(inv.competencia),
                              'MMMM yyyy',
                              { locale: ptBR }
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            Venc.{' '}
                            {inv.due_date
                              ? format(new Date(inv.due_date), 'dd/MM/yyyy')
                              : '-'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            {formatCurrency(inv.total_value)}
                          </p>
                          <Badge
                            variant={
                              isOverdue
                                ? 'destructive'
                                : inv.status === 'PAGA'
                                ? 'default'
                                : 'secondary'
                            }
                            className="text-xs mt-1"
                          >
                            {isOverdue ? 'Vencida' : inv.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
