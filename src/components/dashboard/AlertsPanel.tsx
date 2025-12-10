import { AlertTriangle, Clock, CreditCard, Package, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface Alert {
  type: 'danger' | 'warning' | 'info';
  icon: typeof AlertTriangle;
  title: string;
  description: string;
  action?: string;
  route?: string;
}

interface AlertsPanelProps {
  atrasadas: number;
  valorAtrasado: number;
  pendentes: number;
  valorPendente: number;
  faturasAbertas: number;
  valorFaturas: number;
  alertasEstoque: number;
  produtosEmAlerta: { nome: string; estoque: number; minimo: number }[];
}

export function AlertsPanel({
  atrasadas,
  valorAtrasado,
  pendentes,
  valorPendente,
  faturasAbertas,
  valorFaturas,
  alertasEstoque,
  produtosEmAlerta,
}: AlertsPanelProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const alerts: Alert[] = [];

  if (atrasadas > 0) {
    alerts.push({
      type: 'danger',
      icon: AlertTriangle,
      title: `${atrasadas} pagamentos atrasados`,
      description: `Total de ${formatCurrency(valorAtrasado)}`,
      action: 'Ver pagamentos',
      route: '/financeiro',
    });
  }

  if (pendentes > 0) {
    alerts.push({
      type: 'warning',
      icon: Clock,
      title: `${pendentes} pagamentos próximos`,
      description: `${formatCurrency(valorPendente)} nos próximos 7 dias`,
      action: 'Ver agenda',
      route: '/financeiro',
    });
  }

  if (faturasAbertas > 0) {
    alerts.push({
      type: 'info',
      icon: CreditCard,
      title: `${faturasAbertas} faturas em aberto`,
      description: `Total de ${formatCurrency(valorFaturas)}`,
      action: 'Ver faturas',
      route: '/financeiro',
    });
  }

  if (alertasEstoque > 0) {
    alerts.push({
      type: 'warning',
      icon: Package,
      title: `${alertasEstoque} produtos com estoque baixo`,
      description: produtosEmAlerta.slice(0, 2).map(p => p.nome).join(', '),
      action: 'Ver estoque',
      route: '/estoque',
    });
  }

  if (alerts.length === 0) {
    return null;
  }

  const typeStyles = {
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      border: 'border-rose-200 dark:border-rose-800',
      icon: 'text-rose-600',
      iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      icon: 'text-amber-600',
      iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      icon: 'text-blue-600',
      iconBg: 'bg-blue-100 dark:bg-blue-900/50',
    },
  };

  return (
    <div className="glass-card p-4">
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-amber-600" />
        Alertas Importantes
      </h3>
      <div className="space-y-2">
        {alerts.map((alert, index) => {
          const styles = typeStyles[alert.type];
          return (
            <div
              key={index}
              className={cn(
                'flex items-center gap-3 p-3 rounded-xl border',
                styles.bg,
                styles.border
              )}
            >
              <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center flex-shrink-0', styles.iconBg)}>
                <alert.icon className={cn('h-4 w-4', styles.icon)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground truncate">{alert.description}</p>
              </div>
              {alert.route && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="flex-shrink-0 gap-1"
                  onClick={() => navigate(alert.route!)}
                >
                  {alert.action}
                  <ArrowRight className="h-3 w-3" />
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
