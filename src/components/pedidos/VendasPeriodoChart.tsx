import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pedido {
  id: string;
  valorTotal: number;
  status: string;
  dataPedido: string;
}

interface VendasPeriodoChartProps {
  pedidos: Pedido[];
}

export function VendasPeriodoChart({ pedidos }: VendasPeriodoChartProps) {
  const chartData = useMemo(() => {
    const now = new Date();
    const months: { month: Date; label: string }[] = [];

    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const month = subMonths(now, i);
      months.push({
        month,
        label: format(month, 'MMM', { locale: ptBR }),
      });
    }

    return months.map(({ month, label }) => {
      const start = startOfMonth(month);
      const end = endOfMonth(month);

      const pedidosDoMes = pedidos.filter((p) => {
        const date = new Date(p.dataPedido);
        return isWithinInterval(date, { start, end });
      });

      const vendas = pedidosDoMes
        .filter((p) => p.status !== 'cancelado')
        .reduce((acc, p) => acc + p.valorTotal, 0);

      const quantidade = pedidosDoMes.filter((p) => p.status !== 'cancelado').length;

      return {
        name: label.charAt(0).toUpperCase() + label.slice(1),
        vendas: vendas / 1000, // Em milhares
        quantidade,
      };
    });
  }, [pedidos]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Vendas por Período</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                tickFormatter={(value) => `${value}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number, name: string) => [
                  name === 'vendas' ? `R$ ${(value * 1000).toLocaleString('pt-BR')}` : value,
                  name === 'vendas' ? 'Vendas' : 'Qtd. Pedidos',
                ]}
              />
              <Legend />
              <Bar
                dataKey="vendas"
                name="Vendas (R$ mil)"
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="quantidade"
                name="Pedidos"
                fill="hsl(var(--primary) / 0.4)"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
