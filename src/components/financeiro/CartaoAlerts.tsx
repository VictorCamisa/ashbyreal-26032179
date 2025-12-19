import { useMemo } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Clock, Calendar, X } from 'lucide-react';
import { format, differenceInDays, isAfter, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface CartaoAlertsProps {
  cartoes: any[];
  faturas: any[];
  onDismiss?: (alertId: string) => void;
}

interface AlertItem {
  id: string;
  type: 'danger' | 'warning' | 'info';
  icon: React.ReactNode;
  title: string;
  description: string;
  cartaoName: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function CartaoAlerts({ cartoes, faturas, onDismiss }: CartaoAlertsProps) {
  const alerts = useMemo(() => {
    const now = new Date();
    const alertsList: AlertItem[] = [];

    faturas?.forEach((fatura) => {
      const cartao = cartoes?.find(c => c.id === fatura.credit_card_id);
      if (!cartao || fatura.status === 'PAGA') return;

      const dueDate = fatura.due_date ? new Date(fatura.due_date) : null;
      const closingDate = fatura.closing_date ? new Date(fatura.closing_date) : null;
      const competencia = format(new Date(fatura.competencia), 'MMMM/yyyy', { locale: ptBR });

      // Fatura vencida
      if (dueDate && isBefore(dueDate, now)) {
        const daysOverdue = differenceInDays(now, dueDate);
        alertsList.push({
          id: `overdue-${fatura.id}`,
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
  );
}
