import { useMemo } from 'react';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';

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

    // Exclude cancelled from revenue calculations
    const activePedidos = pedidos.filter(p => p.status !== 'cancelado');

    const pedidosThisMonth = activePedidos.filter((p) => {
      if (!p.dataPedido) return false;
      const date = new Date(p.dataPedido);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const pedidosLastMonth = activePedidos.filter((p) => {
      if (!p.dataPedido) return false;
      const date = new Date(p.dataPedido);
      return date.getMonth() === lastMonth && date.getFullYear() === lastMonthYear;
    });

    const totalValue = pedidosThisMonth.reduce((acc, p) => acc + p.valorTotal, 0);
    const totalValueLast = pedidosLastMonth.reduce((acc, p) => acc + p.valorTotal, 0);
    const pendentes = pedidos.filter((p) => p.status === 'pendente').length;
    const entregues = pedidos.filter((p) => p.status === 'entregue').length;
    
    const ticketMedio = pedidosThisMonth.length > 0 
      ? totalValue / pedidosThisMonth.length 
      : 0;

    const growthPercent = totalValueLast > 0
      ? ((totalValue - totalValueLast) / totalValueLast) * 100
      : 0;

    return {
      pedidosMes: pedidosThisMonth.length,
      pendentes,
      entregues,
      totalValue,
      ticketMedio,
      growthPercent,
    };
  }, [pedidos]);

  return (
    <KPIGrid columns={4}>
      <KPICard
        label="Vendas do Mês"
        value={`R$ ${stats.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        trend={stats.growthPercent !== 0 ? { 
          value: Math.abs(stats.growthPercent), 
          isPositive: stats.growthPercent > 0 
        } : undefined}
        animationDelay={0}
      />
      <KPICard
        label="Ticket Médio"
        value={`R$ ${stats.ticketMedio.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
        animationDelay={50}
      />
      <KPICard
        label="Pedidos"
        value={stats.pedidosMes}
        subtitle="este mês"
        animationDelay={100}
      />
      <KPICard
        label="Pendentes"
        value={stats.pendentes}
        subtitle={`${stats.entregues} entregues`}
        animationDelay={150}
      />
    </KPIGrid>
  );
}
