import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Clock, 
  CreditCard, 
  CalendarClock,
  ChevronRight,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface AlertItem {
  id: string;
  type: 'overdue' | 'upcoming' | 'invoice' | 'pending';
  title: string;
  description: string;
  count?: number;
  amount?: number;
}

interface AlertsBannerProps {
  transacoesAtrasadas: number;
  valorAtrasado: number;
  transacoesPendentes: number;
  valorPendente: number;
  faturasVencendo: number;
  valorFaturas: number;
  onViewOverdue?: () => void;
  onViewPending?: () => void;
  onViewInvoices?: () => void;
}

export function AlertsBanner({
  transacoesAtrasadas,
  valorAtrasado,
  transacoesPendentes,
  valorPendente,
  faturasVencendo,
  valorFaturas,
  onViewOverdue,
  onViewPending,
  onViewInvoices,
}: AlertsBannerProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);

  const alerts: AlertItem[] = [];

  if (transacoesAtrasadas > 0) {
    alerts.push({
      id: 'overdue',
      type: 'overdue',
      title: 'Contas Atrasadas',
      description: `${transacoesAtrasadas} transação(ões) em atraso`,
      count: transacoesAtrasadas,
      amount: valorAtrasado,
    });
  }

  if (transacoesPendentes > 0) {
    alerts.push({
      id: 'pending',
      type: 'pending',
      title: 'Vencendo em 7 dias',
      description: `${transacoesPendentes} conta(s) próximas do vencimento`,
      count: transacoesPendentes,
      amount: valorPendente,
    });
  }

  if (faturasVencendo > 0) {
    alerts.push({
      id: 'invoices',
      type: 'invoice',
      title: 'Faturas de Cartão',
      description: `${faturasVencendo} fatura(s) para pagar`,
      count: faturasVencendo,
      amount: valorFaturas,
    });
  }

  const visibleAlerts = alerts.filter(a => !dismissed.includes(a.id));

  if (visibleAlerts.length === 0) {
    return null;
  }

  const getAlertConfig = (type: AlertItem['type']) => {
    switch (type) {
      case 'overdue':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-destructive/10 border-destructive/20',
          iconColor: 'text-destructive',
          badgeVariant: 'destructive' as const,
        };
      case 'upcoming':
      case 'pending':
        return {
          icon: CalendarClock,
          bgColor: 'bg-amber-500/10 border-amber-500/20',
          iconColor: 'text-amber-600',
          badgeVariant: 'secondary' as const,
        };
      case 'invoice':
        return {
          icon: CreditCard,
          bgColor: 'bg-primary/10 border-primary/20',
          iconColor: 'text-primary',
          badgeVariant: 'default' as const,
        };
    }
  };

  const handleAction = (type: AlertItem['type']) => {
    switch (type) {
      case 'overdue':
        onViewOverdue?.();
        break;
      case 'pending':
        onViewPending?.();
        break;
      case 'invoice':
        onViewInvoices?.();
        break;
    }
  };

  return (
    <div className="space-y-2">
      {visibleAlerts.map((alert) => {
        const config = getAlertConfig(alert.type);
        const Icon = config.icon;

        return (
          <Card 
            key={alert.id} 
            className={cn(
              "border transition-all duration-200",
              config.bgColor
            )}
          >
            <CardContent className="p-3">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
                  config.bgColor
                )}>
                  <Icon className={cn("h-5 w-5", config.iconColor)} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{alert.title}</span>
                    {alert.count && (
                      <Badge variant={config.badgeVariant} className="text-xs">
                        {alert.count}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {alert.description}
                    {alert.amount && alert.amount > 0 && (
                      <span className="ml-1 font-medium">
                        • {alert.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 text-xs gap-1"
                    onClick={() => handleAction(alert.type)}
                  >
                    Ver
                    <ChevronRight className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => setDismissed(prev => [...prev, alert.id])}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
