import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, Calendar } from 'lucide-react';

interface CashFlowData {
  data: string;
  receitas: number;
  despesas: number;
  saldo: number;
  acumulado: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  const formatCurrency = (value: number) => {
    if (Math.abs(value) >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}k`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium text-sm mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 text-sm">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-muted-foreground">{entry.name}:</span>
              <span className="font-medium">
                {entry.value.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  const minValue = Math.min(...data.map((d) => d.acumulado));
  const maxValue = Math.max(...data.map((d) => d.acumulado));

  if (data.length === 0) {
    return (
      <Card className="glass-card">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Previsão de Fluxo de Caixa
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[240px] flex items-center justify-center text-muted-foreground text-sm">
            Nenhuma transação futura encontrada
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            Previsão de Fluxo de Caixa (90 dias)
          </CardTitle>
          <div
            className={`flex items-center gap-1 text-xs font-medium ${
              data[data.length - 1]?.acumulado >= 0
                ? 'text-emerald-600'
                : 'text-destructive'
            }`}
          >
            <TrendingUp
              className={`h-3 w-3 ${
                data[data.length - 1]?.acumulado < 0 ? 'rotate-180' : ''
              }`}
            />
            {formatCurrency(data[data.length - 1]?.acumulado || 0)}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="colorAcumulado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="hsl(var(--border))"
              vertical={false}
            />
            <XAxis
              dataKey="data"
              axisLine={false}
              tickLine={false}
              fontSize={11}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              fontSize={11}
              tickFormatter={formatCurrency}
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            {minValue < 0 && (
              <ReferenceLine y={0} stroke="hsl(var(--border))" strokeDasharray="3 3" />
            )}
            <Area
              type="monotone"
              dataKey="acumulado"
              name="Saldo Acumulado"
              stroke="#3b82f6"
              strokeWidth={2}
              fill="url(#colorAcumulado)"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-2">
          <div className="flex items-center gap-2 text-xs">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">Saldo Acumulado</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
