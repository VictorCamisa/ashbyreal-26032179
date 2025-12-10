import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

interface PedidoItem {
  id: string;
  produtoId: string;
  quantidade: number;
  subtotal: number;
  produto?: {
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
];

export function VendasCategoriaChart({ items }: VendasCategoriaChartProps) {
  const chartData = useMemo(() => {
    const categorias: Record<string, number> = {};

    items.forEach((item) => {
      const categoria = item.produto?.categoria || 'Outros';
      categorias[categoria] = (categorias[categoria] || 0) + item.subtotal;
    });

    return Object.entries(categorias)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [items]);

  const total = chartData.reduce((acc, item) => acc + item.value, 0);

  if (chartData.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium">Vendas por Categoria</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            Sem dados de categorias
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Vendas por Categoria</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value: number) => [
                  `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                  'Vendas',
                ]}
              />
              <Legend
                layout="vertical"
                align="right"
                verticalAlign="middle"
                formatter={(value, entry: any) => {
                  const item = chartData.find((d) => d.name === value);
                  const percent = item ? ((item.value / total) * 100).toFixed(0) : 0;
                  return (
                    <span className="text-xs">
                      {value} ({percent}%)
                    </span>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
