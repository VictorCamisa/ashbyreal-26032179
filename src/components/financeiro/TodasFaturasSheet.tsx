import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Calendar,
  Check
} from 'lucide-react';
import { format, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useFaturasMutations } from '@/hooks/useFaturasMutations';
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

interface TodasFaturasSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  faturas: any[];
  cartoes: any[];
}

export function TodasFaturasSheet({ open, onOpenChange, faturas, cartoes }: TodasFaturasSheetProps) {
  const { payInvoice, isPaying } = useFaturasMutations();
  const [confirmPayId, setConfirmPayId] = useState<string | null>(null);
  const now = new Date();

  const getCartaoName = (cardId: string) => {
    return cartoes?.find(c => c.id === cardId)?.name || 'Cartão';
  };

  const isOverdue = (fatura: any) => {
    return fatura.due_date && isBefore(new Date(fatura.due_date), now) && fatura.status !== 'PAGA';
  };

  // Sort by due_date ascending (closest first)
  const sortByDueDate = (a: any, b: any) => {
    const dateA = a.due_date ? new Date(a.due_date).getTime() : Infinity;
    const dateB = b.due_date ? new Date(b.due_date).getTime() : Infinity;
    return dateA - dateB;
  };

  const faturasAbertas = (faturas?.filter(f => f.status === 'ABERTA' || f.status === 'FECHADA') || []).sort(sortByDueDate);
  const faturasPagas = (faturas?.filter(f => f.status === 'PAGA') || []).sort((a, b) => sortByDueDate(b, a)); // Pagas: mais recente primeiro
  const faturasVencidas = (faturas?.filter(f => isOverdue(f)) || []).sort(sortByDueDate);

  const handlePagar = (invoiceId: string) => {
    payInvoice({ invoiceId });
    setConfirmPayId(null);
  };

  const renderFaturaItem = (fatura: any, showPayButton: boolean = true) => {
    const overdue = isOverdue(fatura);
    const isPaga = fatura.status === 'PAGA';

    return (
      <div 
        key={fatura.id} 
        className={cn(
          "flex items-center justify-between p-4 rounded-xl border transition-all",
          overdue && "bg-destructive/5 border-destructive/20",
          isPaga && "bg-emerald-500/5 border-emerald-500/20",
          !overdue && !isPaga && "bg-muted/30 border-border/50"
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center",
            overdue && "bg-destructive/10",
            isPaga && "bg-emerald-500/10",
            !overdue && !isPaga && "bg-primary/10"
          )}>
            {isPaga ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            ) : overdue ? (
              <AlertTriangle className="h-5 w-5 text-destructive" />
            ) : (
              <CreditCard className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <p className="font-medium">{getCartaoName(fatura.credit_card_id)}</p>
            <p className="text-sm text-muted-foreground">
              {format(new Date(fatura.competencia), 'MMMM yyyy', { locale: ptBR })}
            </p>
            {fatura.due_date && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                <Calendar className="h-3 w-3" />
                Venc: {format(new Date(fatura.due_date), 'dd/MM/yyyy')}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="font-bold text-lg">
              R$ {fatura.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <Badge 
              variant={isPaga ? 'default' : overdue ? 'destructive' : 'secondary'}
              className={cn(
                "text-xs",
                isPaga && "bg-emerald-500 hover:bg-emerald-600"
              )}
            >
              {overdue ? 'Vencida' : fatura.status}
            </Badge>
          </div>
          {showPayButton && !isPaga && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
              onClick={() => setConfirmPayId(fatura.id)}
            >
              <Check className="h-4 w-4" />
              Pagar
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Todas as Faturas
            </SheetTitle>
          </SheetHeader>

          <Tabs defaultValue="abertas" className="mt-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="abertas" className="gap-1">
                <Clock className="h-4 w-4" />
                Abertas ({faturasAbertas.length})
              </TabsTrigger>
              <TabsTrigger value="vencidas" className="gap-1">
                <AlertTriangle className="h-4 w-4" />
                Vencidas ({faturasVencidas.length})
              </TabsTrigger>
              <TabsTrigger value="pagas" className="gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Pagas ({faturasPagas.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="abertas" className="mt-4 space-y-3">
              {faturasAbertas.length > 0 ? (
                faturasAbertas.map((f) => renderFaturaItem(f))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500/50 mb-3" />
                  <p className="text-muted-foreground">Nenhuma fatura em aberto</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="vencidas" className="mt-4 space-y-3">
              {faturasVencidas.length > 0 ? (
                faturasVencidas.map((f) => renderFaturaItem(f))
              ) : (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-emerald-500/50 mb-3" />
                  <p className="text-muted-foreground">Nenhuma fatura vencida</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="pagas" className="mt-4 space-y-3">
              {faturasPagas.length > 0 ? (
                faturasPagas.slice(0, 20).map((f) => renderFaturaItem(f, false))
              ) : (
                <div className="text-center py-8">
                  <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">Nenhuma fatura paga</p>
                </div>
              )}
              {faturasPagas.length > 20 && (
                <p className="text-xs text-center text-muted-foreground">
                  Mostrando 20 de {faturasPagas.length} faturas pagas
                </p>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmPayId} onOpenChange={() => setConfirmPayId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Pagamento</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja marcar esta fatura como paga? Esta ação irá atualizar o status da fatura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmPayId && handlePagar(confirmPayId)}
              disabled={isPaying}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isPaying ? 'Processando...' : 'Confirmar Pagamento'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
