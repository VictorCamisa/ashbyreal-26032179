import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';
import { TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface FluxoItem {
  dia: string;
  entradas: number;
  saidas: number;
  saldo: number;
}

interface FluxoCaixaFiscalProps {
  dados: FluxoItem[];
  isLoading?: boolean;
}

export function FluxoCaixaFiscal({ dados, isLoading }: FluxoCaixaFiscalProps) {
  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Fluxo de Caixa Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  // Prepare data for chart - showing saldo acumulado
  const chartData = dados.map((item, idx) => {
    const saldoAcumulado = dados.slice(0, idx + 1).reduce((acc, curr) => acc + curr.saldo, 0);
    return {
      ...item,
      saldoAcumulado
    };
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Fluxo de Caixa Fiscal (Saldo Acumulado)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {dados.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-muted-foreground">
            Nenhum dado fiscal para o período
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <XAxis 
                  dataKey="dia" 
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `R$ ${(value/1000).toFixed(0)}k`}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  labelFormatter={(label) => `Dia ${label}`}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--popover))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <ReferenceLine y={0} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" />
                <Bar dataKey="saldoAcumulado" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.saldoAcumulado >= 0 ? 'hsl(var(--primary))' : 'hsl(var(--destructive))'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Resumo do Período */}
        {dados.length > 0 && (
          <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Entradas</div>
              <div className="text-lg font-semibold text-red-600">
                {formatCurrency(dados.reduce((acc, d) => acc + d.entradas, 0))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Total Saídas</div>
              <div className="text-lg font-semibold text-green-600">
                {formatCurrency(dados.reduce((acc, d) => acc + d.saidas, 0))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Saldo Final</div>
              <div className={`text-lg font-bold ${
                chartData[chartData.length - 1]?.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(chartData[chartData.length - 1]?.saldoAcumulado || 0)}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
