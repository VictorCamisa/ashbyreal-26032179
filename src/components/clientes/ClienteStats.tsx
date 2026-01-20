import { Card, CardContent } from '@/components/ui/card';
import { ShoppingCart, DollarSign, TrendingUp, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClienteStatsProps {
  stats: {
    totalPedidos: number;
    valorTotal: number;
    ticketMedio: number;
    pedidosPendentes: number;
    ultimoPedido: string | null;
  };
}

export function ClienteStats({ stats }: ClienteStatsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const kpis = [
    {
      label: 'Total de Pedidos',
      value: stats.totalPedidos.toString(),
      icon: ShoppingCart,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Valor Total',
      value: formatCurrency(stats.valorTotal),
      icon: DollarSign,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Ticket Médio',
      value: formatCurrency(stats.ticketMedio),
      icon: TrendingUp,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Pedidos Pendentes',
      value: stats.pedidosPendentes.toString(),
      icon: Clock,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.label} className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${kpi.bgColor}`}>
                <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                <p className="text-lg font-bold">{kpi.value}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
