import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  CreditCard,
  Truck,
  XCircle,
  MoreHorizontal,
  CheckCircle,
  Clock,
  RotateCcw,
} from 'lucide-react';
import { usePedidosMutations } from '@/hooks/usePedidosMutations';
import { cn } from '@/lib/utils';

interface PedidoStatusWorkflowProps {
  pedidoId: string;
  currentStatus: string;
  statusHistory?: any[];
  onStatusChange?: () => void;
}

const statusConfig: Record<
  string,
  { label: string; color: string; icon: React.ElementType; nextActions: string[] }
> = {
  pendente: {
    label: 'Pendente',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
    icon: Clock,
    nextActions: ['pago', 'cancelado'],
  },
  pago: {
    label: 'Pago',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
    icon: CreditCard,
    nextActions: ['entregue', 'cancelado'],
  },
  entregue: {
    label: 'Entregue',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    icon: CheckCircle,
    nextActions: [],
  },
  cancelado: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
    icon: XCircle,
    nextActions: ['pendente'],
  },
};

const actionConfig: Record<string, { label: string; icon: React.ElementType; variant?: 'default' | 'destructive' | 'outline' }> = {
  pago: { label: 'Marcar como Pago', icon: CreditCard, variant: 'default' },
  entregue: { label: 'Marcar como Entregue', icon: Truck, variant: 'default' },
  cancelado: { label: 'Cancelar Pedido', icon: XCircle, variant: 'destructive' },
  pendente: { label: 'Reabrir Pedido', icon: RotateCcw, variant: 'outline' },
};

export function PedidoStatusWorkflow({
  pedidoId,
  currentStatus,
  statusHistory = [],
  onStatusChange,
}: PedidoStatusWorkflowProps) {
  const { updatePedidoStatus, isLoading } = usePedidosMutations();
  const config = statusConfig[currentStatus] || statusConfig.pendente;
  const StatusIcon = config.icon;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updatePedidoStatus(pedidoId, newStatus, statusHistory);
      onStatusChange?.();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const nextActions = config.nextActions;
  const primaryAction = nextActions[0];
  const secondaryActions = nextActions.slice(1);

  return (
    <div className="flex items-center gap-2">
      <Badge variant="outline" className={cn('gap-1.5', config.color)}>
        <StatusIcon className="h-3 w-3" />
        {config.label}
      </Badge>

      {primaryAction && (
        <Button
          size="sm"
          variant={actionConfig[primaryAction]?.variant || 'default'}
          onClick={() => handleStatusChange(primaryAction)}
          disabled={isLoading}
          className="h-7 text-xs gap-1.5"
        >
          {(() => {
            const Icon = actionConfig[primaryAction]?.icon;
            return Icon ? <Icon className="h-3 w-3" /> : null;
          })()}
          {actionConfig[primaryAction]?.label}
        </Button>
      )}

      {secondaryActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondaryActions.map((action) => {
              const Icon = actionConfig[action]?.icon;
              return (
                <DropdownMenuItem
                  key={action}
                  onClick={() => handleStatusChange(action)}
                  className={cn(
                    action === 'cancelado' && 'text-destructive focus:text-destructive'
                  )}
                >
                  {Icon && <Icon className="h-4 w-4 mr-2" />}
                  {actionConfig[action]?.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
