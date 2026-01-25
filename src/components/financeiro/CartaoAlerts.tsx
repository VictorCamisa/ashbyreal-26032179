import { useMemo, useState } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Calendar, X, Check } from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { formatCompetencia } from '@/lib/dateUtils';
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

interface CartaoAlertsProps {
  cartoes: any[];
  faturas: any[];
  onDismiss?: (alertId: string) => void;
}

interface AlertItem {
  id: string;
  faturaId: string;
  type: 'danger' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  description: string;
  cartaoName: string;
}

export function CartaoAlerts({ cartoes, faturas, onDismiss }: CartaoAlertsProps) {
  const { payInvoice, isPaying } = useFaturasMutations();
  const [confirmPayId, setConfirmPayId] = useState<string | null>(null);

  const alerts = useMemo(() => {
    const now = new Date();
    const alertsList: AlertItem[] = [];

    faturas?.forEach((fatura) => {
      const cartao = cartoes?.find(c => c.id === fatura.credit_card_id);
      if (!cartao || fatura.status === 'PAGA') return;

      const dueDate = fatura.due_date ? new Date(fatura.due_date) : null;
      const closingDate = fatura.closing_date ? new Date(fatura.closing_date) : null;
      const competencia = formatCompetencia(fatura.competencia);

      // Fatura vencida
      if (dueDate && isBefore(dueDate, now)) {
        const daysOverdue = differenceInDays(now, dueDate);
        alertsList.push({
          id: `overdue-${fatura.id}`,
          faturaId: fatura.id,
          type: 'danger',
          icon: <AlertTriangle className="h-4 w-4" />,
          title: 'Fatura Vencida',
          description: `Venceu há ${daysOverdue} ${daysOverdue === 1 ? 'dia' : 'dias'} - ${competencia}`,
          cartaoName: cartao.name,
        });
      }
      // Fatura vence em até 5 dias
      else if (dueDate && isBefore(dueDate, addDays(now, 5)) && isAfter(dueDate, now)) {
        const daysUntilDue = differenceInDays(dueDate, now);
        alertsList.push({
          id: `due-soon-${fatura.id}`,
          faturaId: fatura.id,
          type: 'warning',
          icon: <Clock className="h-4 w-4" />,
          title: 'Vencimento Próximo',
          description: `Vence em ${daysUntilDue} ${daysUntilDue === 1 ? 'dia' : 'dias'} (${format(dueDate, 'dd/MM')}) - ${competencia}`,
          cartaoName: cartao.name,
        });
      }

      // Fatura fecha em até 3 dias
      if (closingDate && isBefore(closingDate, addDays(now, 3)) && isAfter(closingDate, now) && fatura.status === 'ABERTA') {
        const daysUntilClose = differenceInDays(closingDate, now);
        alertsList.push({
          id: `closing-${fatura.id}`,
          faturaId: fatura.id,
          type: 'info',
          icon: <Calendar className="h-4 w-4" />,
          title: 'Fatura Fechando',
          description: `Fecha em ${daysUntilClose} ${daysUntilClose === 1 ? 'dia' : 'dias'} (${format(closingDate, 'dd/MM')}) - ${competencia}`,
          cartaoName: cartao.name,
        });
      }
    });

    // Sort by priority: danger > warning > info
    return alertsList.sort((a, b) => {
      const priority = { danger: 0, warning: 1, info: 2 };
      return priority[a.type] - priority[b.type];
    });
  }, [cartoes, faturas]);

  const handlePagar = (invoiceId: string) => {
    payInvoice({ invoiceId });
    setConfirmPayId(null);
  };

  if (alerts.length === 0) return null;

  const typeStyles = {
    danger: 'bg-destructive/10 border-destructive/30 text-destructive',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
  };

  const iconStyles = {
    danger: 'bg-destructive/20 text-destructive',
    warning: 'bg-amber-500/20 text-amber-600 dark:text-amber-400',
    info: 'bg-blue-500/20 text-blue-600 dark:text-blue-400',
  };

  return (
    <>
      <div className="space-y-2">
        {alerts.slice(0, 3).map((alert) => (
          <Alert
            key={alert.id}
            className={cn(
              'relative pr-10 transition-all',
              typeStyles[alert.type]
            )}
          >
            <div className="flex items-start gap-3">
              <div className={cn('p-1.5 rounded-lg shrink-0', iconStyles[alert.type])}>
                {alert.icon}
              </div>
              <AlertDescription className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm">{alert.title}</span>
                  <span className="text-xs opacity-70">• {alert.cartaoName}</span>
                </div>
                <p className="text-xs opacity-90">{alert.description}</p>
              </AlertDescription>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1 text-xs h-7 bg-background/50 hover:bg-emerald-500/10 hover:text-emerald-600 hover:border-emerald-500/30"
                onClick={() => setConfirmPayId(alert.faturaId)}
              >
                <Check className="h-3 w-3" />
                Pagar
              </Button>
            </div>
            {onDismiss && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 h-6 w-6 opacity-60 hover:opacity-100"
                onClick={() => onDismiss(alert.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </Alert>
        ))}
        {alerts.length > 3 && (
          <p className="text-xs text-muted-foreground text-center">
            + {alerts.length - 3} outros alertas
          </p>
        )}
      </div>

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
