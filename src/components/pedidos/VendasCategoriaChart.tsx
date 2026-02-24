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
  Cell,
} from 'recharts';
import { ShoppingBag } from 'lucide-react';

interface PedidoItem {
  id: string;
  produtoId: string;
  quantidade: number;
  subtotal: number;
  produto?: {
    nome?: string;
    categoria?: string;
  };
}

interface VendasCategoriaChartProps {
  items: PedidoItem[];
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  'hsl(142 76% 36%)',
  'hsl(221 83% 53%)',
  'hsl(262 83% 58%)',
  'hsl(340 75% 55%)',
  'hsl(25 95% 53%)',
];

export function VendasCategoriaChart({ items }: VendasCategoriaChartProps) {
  const chartData = useMemo(() => {
    const produtoStats: Record<string, { nome: string; total: number; quantidade: number }> = {};

    items.forEach((item) => {
      const key = item.produtoId;
      if (!produtoStats[key]) {
        produtoStats[key] = {
          nome: item.produto?.nome || 'Produto',
          total: 0,
          quantidade: 0,
        };
      }
      produtoStats[key].total += item.subtotal;
      produtoStats[key].quantidade += item.quantidade;
    });

    return Object.values(produtoStats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 8)
      .map((p) => ({
        ...p,
        // Truncate long names for axis
        label: p.nome.length > 18 ? p.nome.slice(0, 16) + '…' : p.nome,
        totalK: Math.round(p.total),
      }));
  }, [items]);

  if (chartData.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Vendas por Produto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            Sem dados de produtos
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" />
          Vendas por Produto
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                tickFormatter={(v) =>
                  v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v.toString()
                }
              />
              <YAxis
                type="category"
                dataKey="label"
                tick={{ fontSize: 11 }}
                className="text-muted-foreground"
                width={110}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  fontSize: '13px',
                }}
                formatter={(value: number) => [
                  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  'Faturamento',
                ]}
                labelFormatter={(label) => {
                  const item = chartData.find((d) => d.label === label);
                  return item ? `${item.nome} (${item.quantidade} un.)` : label;
                }}
              />
              <Bar dataKey="totalK" name="Faturamento" radius={[0, 6, 6, 0]} barSize={24}>
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
