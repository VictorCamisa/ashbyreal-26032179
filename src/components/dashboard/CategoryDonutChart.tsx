import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

interface CategoryDonutChartProps {
  data: { nome: string; valor: number }[];
  title: string;
}

const COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--success))',
  'hsl(142, 76%, 36%)',
  'hsl(var(--warning))',
  'hsl(262, 83%, 58%)',
  'hsl(199, 89%, 48%)',
];

export function CategoryDonutChart({ data, title }: CategoryDonutChartProps) {
  const total = data.reduce((acc, item) => acc + item.valor, 0);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: value >= 10000 ? 'compact' : 'standard',
      maximumFractionDigits: value >= 10000 ? 1 : 2,
    }).format(value);

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-primary" />
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[180px] flex items-center justify-center text-sm text-muted-foreground">
            Sem dados para exibir
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <PieChartIcon className="h-4 w-4 text-primary" />
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4">
          <ResponsiveContainer width={120} height={120}>
            <PieChart>
              <Pie
                data={data.slice(0, 6)}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={55}
                paddingAngle={2}
                dataKey="valor"
                nameKey="nome"
              >
                {data.slice(0, 6).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), '']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--popover))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  color: 'hsl(var(--popover-foreground))'
                }}
                labelStyle={{ color: 'hsl(var(--popover-foreground))' }}
                itemStyle={{ color: 'hsl(var(--popover-foreground))' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          <div className="flex-1 space-y-2">
            {data.slice(0, 5).map((item, index) => (
              <div key={item.nome} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div 
                    className="h-2.5 w-2.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-muted-foreground truncate">{item.nome}</span>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-muted-foreground">
                    {((item.valor / total) * 100).toFixed(0)}%
                  </span>
                  <span className="font-medium tabular-nums w-16 text-right">
                    {formatCurrency(item.valor)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
