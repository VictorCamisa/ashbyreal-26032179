import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ShoppingCart, ArrowRight, Clock, CheckCircle, Package } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface PedidoStatus {
  status: string;
  count: number;
  valor: number;
}

interface PedidosTimelineProps {
  total: number;
  pendentes: number;
  emAndamento: number;
  valorPendente: number;
  byStatus: PedidoStatus[];
}

export function PedidosTimeline({ total, pendentes, emAndamento, valorPendente, byStatus }: PedidosTimelineProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const statusConfig: Record<string, { icon: typeof Clock; color: string; bgColor: string }> = {
    pendente: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
    aguardando: { icon: Clock, color: 'text-amber-600', bgColor: 'bg-amber-100 dark:bg-amber-900/30' },
    novo: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
    em_andamento: { icon: Package, color: 'text-violet-600', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
    processando: { icon: Package, color: 'text-violet-600', bgColor: 'bg-violet-100 dark:bg-violet-900/30' },
    separando: { icon: Package, color: 'text-cyan-600', bgColor: 'bg-cyan-100 dark:bg-cyan-900/30' },
    entregue: { icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
    concluido: { icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
    pago: { icon: CheckCircle, color: 'text-emerald-600', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30' },
    cancelado: { icon: Clock, color: 'text-rose-600', bgColor: 'bg-rose-100 dark:bg-rose-900/30' },
  };

  const getStatusConfig = (status: string) => {
    const key = status.toLowerCase().replace(' ', '_');
    return statusConfig[key] || statusConfig.pendente;
  };

  const sortedStatus = [...byStatus].sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            Pedidos em Aberto
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 text-xs"
            onClick={() => navigate('/pedidos')}
          >
            Ver todos
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-muted/30 rounded-xl">
          <div className="text-center">
            <p className="text-2xl font-bold">{total}</p>
            <p className="text-xs text-muted-foreground">Total</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-amber-600">{pendentes}</p>
            <p className="text-xs text-muted-foreground">Pendentes</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-violet-600">{formatCurrency(valorPendente)}</p>
            <p className="text-xs text-muted-foreground">Valor Pendente</p>
          </div>
        </div>

        {/* Status breakdown */}
        <div className="space-y-2">
          {sortedStatus.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">Nenhum pedido</p>
          ) : (
            sortedStatus.map((item) => {
              const config = getStatusConfig(item.status);
              const Icon = config.icon;
              return (
                <div
                  key={item.status}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/30 transition-colors"
                >
                  <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center', config.bgColor)}>
                    <Icon className={cn('h-4 w-4', config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium capitalize">{item.status.replace('_', ' ')}</p>
                  </div>
                  <Badge variant="secondary" className="font-semibold">
                    {item.count}
                  </Badge>
                  <span className="text-xs text-muted-foreground w-20 text-right">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
