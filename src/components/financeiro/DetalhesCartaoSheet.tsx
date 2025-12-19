import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, isBefore, isAfter, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CreditCard,
  Calendar,
  Receipt,
  Search,
  ChevronLeft,
  ChevronRight,
  Wallet,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Banknote,
  ArrowUpRight,
  MoreVertical,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useFaturasMutations } from '@/hooks/useFaturasMutations';
import { useLimparImportacao } from '@/hooks/useLimparImportacao';

interface DetalhesCartaoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartao: any;
}

export function DetalhesCartaoSheet({ open, onOpenChange, cartao }: DetalhesCartaoSheetProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [referenceMonth, setReferenceMonth] = useState(new Date());
  const [parcelasFilter, setParcelasFilter] = useState<string>('todas');
  const [invoiceToPay, setInvoiceToPay] = useState<any>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  const { payInvoice, isPaying, updateInvoiceStatus } = useFaturasMutations();
  const { limparImportacao, isLimpando } = useLimparImportacao();

  const monthStr = referenceMonth.toISOString().slice(0, 7);
  const monthLabel = format(referenceMonth, 'MMMM yyyy', { locale: ptBR });

  // Fetch invoices for this card (moved up to use in transactions query)
  const { data: invoices, isLoading: isLoadingInvoices } = useQuery({
    queryKey: ['card-invoices', cartao?.id],
    queryFn: async () => {
      if (!cartao?.id) return [];

      const { data, error } = await supabase
        .from('credit_card_invoices')
        .select('*')
        .eq('credit_card_id', cartao.id)
        .order('competencia', { ascending: false })
        .limit(24);

      if (error) throw error;
      return data || [];
    },
    enabled: open && !!cartao?.id,
  });

  // Get the current invoice for the selected month
  const currentInvoice = invoices?.find((inv) =>
    inv.competencia.startsWith(monthStr)
  );

  // Fetch transactions for this card by invoice_id (competência) NOT purchase_date
  const { data: transactions, isLoading: isLoadingTransactions } = useQuery({
    queryKey: ['card-transactions', cartao?.id, currentInvoice?.id],
    queryFn: async () => {
      if (!cartao?.id) return [];
      
      // Se temos uma fatura para esse mês, buscar por invoice_id
      if (currentInvoice?.id) {
        const { data, error } = await supabase
          .from('credit_card_transactions')
          .select(`
            *,
            categories(name, group),
            subcategories(name)
          `)
          .eq('invoice_id', currentInvoice.id)
          .order('purchase_date', { ascending: false });

        if (error) throw error;
        return data || [];
      }
      
      // Fallback: se não há fatura, não há transações para esse mês
      return [];
    },
    enabled: open && !!cartao?.id && invoices !== undefined,
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

  const handlePayInvoice = () => {
    if (invoiceToPay) {
      payInvoice({ invoiceId: invoiceToPay.id });
      setInvoiceToPay(null);
    }
  };

  const handleDeleteInvoice = async () => {
    if (invoiceToDelete && cartao) {
      const competencia = invoiceToDelete.competencia.slice(0, 7); // YYYY-MM
      await limparImportacao({ creditCardId: cartao.id, competencia });
      setInvoiceToDelete(null);
    }
  };

  const handleDeleteAll = async () => {
    if (cartao) {
      await limparImportacao({ creditCardId: cartao.id });
      setDeleteAllConfirm(false);
    }
  };

  if (!cartao) return null;

  const limitValue = cartao.limit_value || 0;
  const currentValue = currentInvoice?.total_value || totals.total;
  const usagePercent = limitValue > 0 ? (currentValue / limitValue) * 100 : 0;
  const availableLimit = Math.max(0, limitValue - currentValue);

  // Get invoice status info
  const getInvoiceStatusInfo = (invoice: any) => {
    const now = new Date();
    const dueDate = invoice.due_date ? new Date(invoice.due_date) : null;
    const closingDate = invoice.closing_date ? new Date(invoice.closing_date) : null;

    if (invoice.status === 'PAGA') {
      return { label: 'Paga', variant: 'default' as const, color: 'text-emerald-600', bgColor: 'bg-emerald-500/10' };
    }
    
    if (dueDate && isBefore(dueDate, now)) {
      const days = differenceInDays(now, dueDate);
      return { label: `Vencida há ${days}d`, variant: 'destructive' as const, color: 'text-destructive', bgColor: 'bg-destructive/10' };
    }

    if (dueDate && isBefore(dueDate, addDays(now, 5))) {
      const days = differenceInDays(dueDate, now);
      return { label: `Vence em ${days}d`, variant: 'secondary' as const, color: 'text-amber-600', bgColor: 'bg-amber-500/10' };
    }

    if (invoice.status === 'FECHADA') {
      return { label: 'Fechada', variant: 'secondary' as const, color: 'text-primary', bgColor: 'bg-primary/10' };
    }

    if (closingDate && isBefore(closingDate, addDays(now, 3)) && isAfter(closingDate, now)) {
      const days = differenceInDays(closingDate, now);
      return { label: `Fecha em ${days}d`, variant: 'outline' as const, color: 'text-blue-600', bgColor: 'bg-blue-500/10' };
    }

    return { label: 'Aberta', variant: 'outline' as const, color: 'text-muted-foreground', bgColor: 'bg-muted/50' };
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 overflow-hidden flex flex-col bg-gradient-to-b from-background to-muted/20">
          {/* Header - Bank-style card visualization */}
          <div className="relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-primary/70" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMzAiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-50" />
            
            <div className="relative p-6 pb-8 text-primary-foreground">
              <SheetHeader className="space-y-0 mb-6">
                <div className="flex items-center justify-between">
                  <SheetTitle className="text-primary-foreground/90 text-sm font-normal">
                    {cartao.card_provider || 'Cartão de Crédito'}
                  </SheetTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-primary-foreground/80 hover:text-primary-foreground hover:bg-primary-foreground/10">
                        <MoreVertical className="h-5 w-5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover">
                      <DropdownMenuItem 
                        onClick={() => setDeleteAllConfirm(true)}
                        className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                        Limpar Todo Cartão
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </SheetHeader>

              {/* Card Name */}
              <h2 className="text-2xl font-bold mb-1">{cartao.name}</h2>
              <p className="text-sm text-primary-foreground/70 mb-6">
                Venc. dia {cartao.due_day || '-'} • Fecha dia {cartao.closing_day || '-'}
              </p>

              {/* Current Invoice Value - Large Display */}
              <div className="mb-4">
                <p className="text-xs text-primary-foreground/70 uppercase tracking-wider mb-1">
                  Fatura {monthLabel}
                </p>
                <p className="text-4xl font-bold tracking-tight">
                  {formatCurrency(currentValue)}
                </p>
              </div>

              {/* Limit Bar */}
              {limitValue > 0 && (
                <div className="space-y-2">
                  <Progress 
                    value={Math.min(usagePercent, 100)} 
                    className="h-2 bg-primary-foreground/20 [&>div]:bg-primary-foreground"
                  />
                  <div className="flex justify-between text-xs text-primary-foreground/70">
                    <span>Limite disponível: {formatCurrency(availableLimit)}</span>
                    <span>{usagePercent.toFixed(0)}% usado</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-2 px-4 -mt-4 relative z-10">
            <div className="bg-card rounded-xl p-3 shadow-lg border">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Wallet className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wide">Total</span>
              </div>
              <p className="font-bold text-sm">{formatCurrency(totals.total)}</p>
            </div>
            <div className="bg-card rounded-xl p-3 shadow-lg border">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <TrendingUp className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wide">Parcelado</span>
              </div>
              <p className="font-bold text-sm">{formatCurrency(totals.parceladas)}</p>
            </div>
            <div className="bg-card rounded-xl p-3 shadow-lg border">
              <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                <Banknote className="h-3.5 w-3.5" />
                <span className="text-[10px] uppercase tracking-wide">À Vista</span>
              </div>
              <p className="font-bold text-sm">{formatCurrency(totals.avista)}</p>
            </div>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="transacoes" className="flex-1 flex flex-col overflow-hidden mt-4">
            <TabsList className="grid w-full grid-cols-2 mx-4 w-[calc(100%-2rem)]">
              <TabsTrigger value="transacoes" className="gap-2 text-xs">
                <Receipt className="h-3.5 w-3.5" />
                Transações
              </TabsTrigger>
              <TabsTrigger value="faturas" className="gap-2 text-xs">
                <Calendar className="h-3.5 w-3.5" />
                Faturas
              </TabsTrigger>
            </TabsList>

            <TabsContent value="transacoes" className="flex-1 flex flex-col overflow-hidden mt-3 px-4">
              {/* Month Navigation */}
              <div className="flex items-center justify-center gap-2 mb-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handlePrevMonth}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium capitalize min-w-[120px] text-center">
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

              {/* Search and Filter */}
              <div className="flex items-center gap-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar transação..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 h-9 text-sm"
                  />
                </div>
                <Select value={parcelasFilter} onValueChange={setParcelasFilter}>
                  <SelectTrigger className="w-[100px] h-9 text-xs">
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
              <ScrollArea className="flex-1 -mx-4 px-4">
                {isLoadingTransactions ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Carregando...
                  </div>
                ) : filteredTransactions.length === 0 ? (
                  <div className="py-12 text-center">
                    <Receipt className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma transação encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-1 pb-4">
                    {filteredTransactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group"
                      >
                        {/* Icon */}
                        <div className="h-10 w-10 rounded-full bg-muted/80 flex items-center justify-center shrink-0">
                          <ArrowUpRight className="h-4 w-4 text-destructive" />
                        </div>
                        
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {t.description || 'Sem descrição'}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(t.purchase_date), 'dd MMM', { locale: ptBR })}
                            </span>
                            {t.total_installments > 1 && (
                              <Badge variant="secondary" className="text-[10px] py-0 h-4 px-1.5">
                                {t.installment_number}/{t.total_installments}
                              </Badge>
                            )}
                            {t.categories?.name && (
                              <span className="text-[10px] text-muted-foreground">
                                {t.categories.name}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Amount */}
                        <span className="text-sm font-semibold text-foreground">
                          {formatCurrency(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </TabsContent>

            <TabsContent value="faturas" className="flex-1 overflow-hidden mt-3 px-4">
              <ScrollArea className="h-full -mx-4 px-4">
                {isLoadingInvoices ? (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Carregando...
                  </div>
                ) : !invoices || invoices.length === 0 ? (
                  <div className="py-12 text-center">
                    <Calendar className="h-10 w-10 mx-auto text-muted-foreground/30 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma fatura encontrada</p>
                  </div>
                ) : (
                  <div className="space-y-2 pb-4">
                    {invoices.map((inv) => {
                      const statusInfo = getInvoiceStatusInfo(inv);
                      const canPay = inv.status !== 'PAGA';

                      return (
                        <div
                          key={inv.id}
                          className={cn(
                            'relative p-4 rounded-xl border transition-all',
                            statusInfo.bgColor
                          )}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-start gap-3">
                              {/* Status Icon */}
                              <div className={cn(
                                'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                                inv.status === 'PAGA' ? 'bg-emerald-500/20' : 
                                statusInfo.variant === 'destructive' ? 'bg-destructive/20' : 'bg-primary/10'
                              )}>
                                {inv.status === 'PAGA' ? (
                                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                ) : statusInfo.variant === 'destructive' ? (
                                  <AlertTriangle className="h-5 w-5 text-destructive" />
                                ) : (
                                  <Clock className="h-5 w-5 text-primary" />
                                )}
                              </div>

                              {/* Info */}
                              <div>
                                <p className="font-semibold capitalize">
                                  {format(new Date(inv.competencia), 'MMMM yyyy', { locale: ptBR })}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {inv.due_date 
                                    ? `Vencimento: ${format(new Date(inv.due_date), 'dd/MM/yyyy')}`
                                    : 'Sem data de vencimento'
                                  }
                                </p>
                                <Badge 
                                  variant={statusInfo.variant}
                                  className="text-[10px] mt-2"
                                >
                                  {statusInfo.label}
                                </Badge>
                              </div>
                            </div>

                            {/* Value and Actions */}
                            <div className="text-right flex flex-col items-end gap-2">
                              <p className="text-lg font-bold">
                                {formatCurrency(inv.total_value)}
                              </p>
                              
                              <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-popover">
                                    {canPay && (
                                      <DropdownMenuItem 
                                        onClick={() => setInvoiceToPay(inv)}
                                        className="gap-2 cursor-pointer"
                                      >
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                        Marcar como Paga
                                      </DropdownMenuItem>
                                    )}
                                    {inv.status === 'ABERTA' && (
                                      <DropdownMenuItem 
                                        onClick={() => updateInvoiceStatus({ invoiceId: inv.id, status: 'FECHADA' })}
                                        className="gap-2 cursor-pointer"
                                      >
                                        <Clock className="h-4 w-4" />
                                        Fechar Fatura
                                      </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => setInvoiceToDelete(inv)}
                                      className="gap-2 cursor-pointer text-destructive focus:text-destructive"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                      Limpar Fatura
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                          </div>

                          {/* Pay Button for prominent display */}
                          {canPay && inv.status === 'FECHADA' && (
                            <Button
                              onClick={() => setInvoiceToPay(inv)}
                              className="w-full mt-3 gap-2 bg-emerald-600 hover:bg-emerald-700"
                              size="sm"
                            >
                              <CheckCircle2 className="h-4 w-4" />
                              Pagar Fatura
                            </Button>
                          )}
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

      {/* Confirm Pay Dialog */}
      <AlertDialog open={!!invoiceToPay} onOpenChange={() => setInvoiceToPay(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja marcar a fatura de{' '}
              <strong>
                {invoiceToPay && format(new Date(invoiceToPay.competencia), 'MMMM yyyy', { locale: ptBR })}
              </strong>{' '}
              no valor de{' '}
              <strong>{invoiceToPay && formatCurrency(invoiceToPay.total_value)}</strong>{' '}
              como paga?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handlePayInvoice}
              disabled={isPaying}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isPaying ? 'Processando...' : 'Confirmar Pagamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Invoice Dialog */}
      <AlertDialog open={!!invoiceToDelete} onOpenChange={() => setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Limpar Fatura
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá <strong>excluir todas as transações</strong> da fatura de{' '}
              <strong>
                {invoiceToDelete && format(new Date(invoiceToDelete.competencia), 'MMMM yyyy', { locale: ptBR })}
              </strong>{' '}
              do cartão <strong>{cartao?.name}</strong>.
              <br /><br />
              Esta ação não pode ser desfeita. Você precisará reimportar os dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteInvoice}
              disabled={isLimpando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLimpando ? 'Limpando...' : 'Confirmar Exclusão'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete All Dialog */}
      <AlertDialog open={deleteAllConfirm} onOpenChange={setDeleteAllConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              Limpar TUDO do Cartão
            </AlertDialogTitle>
            <AlertDialogDescription>
              Isso irá <strong>excluir TODAS as transações e faturas</strong> do cartão{' '}
              <strong>{cartao?.name}</strong>.
              <br /><br />
              Esta ação não pode ser desfeita. Você precisará reimportar todos os dados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAll}
              disabled={isLimpando}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLimpando ? 'Limpando...' : 'Confirmar Exclusão Total'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
