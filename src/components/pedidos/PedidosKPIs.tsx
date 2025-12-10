import { useMemo } from 'react';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { ShoppingCart, Package, Clock, DollarSign, TrendingUp, CheckCircle } from 'lucide-react';

interface Pedido {
  id: string;
  valorTotal: number;
  status: string;
  dataPedido: string;
}

interface PedidosKPIsProps {
  pedidos: Pedido[];
}

export function PedidosKPIs({ pedidos }: PedidosKPIsProps) {
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pedidosThisMonth = pedidos.filter((p) => {
      const date = new Date(p.dataPedido);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const pedidosLastMonth = pedidos.filter((p) => {
      const date = new Date(p.dataPedido);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    const totalValue = pedidosThisMonth.reduce((acc, p) => acc + p.valorTotal, 0);
    const totalValueLast = pedidosLastMonth.reduce((acc, p) => acc + p.valorTotal, 0);
    const pendentes = pedidos.filter((p) => p.status === 'pendente').length;
    const entregues = pedidos.filter((p) => p.status === 'entregue').length;
    const pagos = pedidos.filter((p) => p.status === 'pago').length;
    
    const ticketMedio = pedidosThisMonth.length > 0 
      ? totalValue / pedidosThisMonth.length 
      : 0;

    const ticketMedioLast = pedidosLastMonth.length > 0
      ? totalValueLast / pedidosLastMonth.length
      : 0;

    const growthPercent = totalValueLast > 0
      ? ((totalValue - totalValueLast) / totalValueLast) * 100
      : 0;

    const ticketGrowth = ticketMedioLast > 0
      ? ((ticketMedio - ticketMedioLast) / ticketMedioLast) * 100
      : 0;

    return {
      totalPedidos: pedidos.length,
      pedidosMes: pedidosThisMonth.length,
      pendentes,
      entregues,
      pagos,
      totalValue,
      ticketMedio,
      growthPercent,
      ticketGrowth,
    };
  }, [pedidos]);

  return (
    <KPIGrid columns={3}>
      <KPICard
        label="Vendas do Mês"
        value={`R$ ${(stats.totalValue / 1000).toFixed(1)}k`}
        icon={DollarSign}
        subtitle={
          stats.growthPercent !== 0
            ? `${stats.growthPercent > 0 ? '+' : ''}${stats.growthPercent.toFixed(1)}% vs mês anterior`
            : undefined
        }
        trend={
          stats.growthPercent !== 0
            ? { value: Math.abs(stats.growthPercent), isPositive: stats.growthPercent > 0 }
            : undefined
        }
      />
      <KPICard
        label="Ticket Médio"
        value={`R$ ${stats.ticketMedio.toFixed(0)}`}
        icon={TrendingUp}
        subtitle={
          stats.ticketGrowth !== 0
            ? `${stats.ticketGrowth > 0 ? '+' : ''}${stats.ticketGrowth.toFixed(1)}%`
            : undefined
        }
        trend={
          stats.ticketGrowth !== 0
            ? { value: Math.abs(stats.ticketGrowth), isPositive: stats.ticketGrowth > 0 }
            : undefined
        }
      />
      <KPICard
        label="Pedidos no Mês"
        value={stats.pedidosMes}
        icon={ShoppingCart}
        subtitle={`${stats.totalPedidos} total`}
      />
      <KPICard
        label="Pendentes"
        value={stats.pendentes}
        icon={Clock}
        variant="warning"
      />
      <KPICard
        label="Pagos"
        value={stats.pagos}
        icon={CheckCircle}
        variant="success"
      />
      <KPICard
        label="Entregues"
        value={stats.entregues}
        icon={Package}
        variant="blue"
      />
    </KPIGrid>
  );
}
