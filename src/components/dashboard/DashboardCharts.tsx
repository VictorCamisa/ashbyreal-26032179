import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { VendasPorDia, ProdutoMaisVendido, LeadPorOrigem } from '@/hooks/useDashboard';

interface DashboardChartsProps {
  vendasPorDia?: VendasPorDia[];
  produtosMaisVendidos?: ProdutoMaisVendido[];
  leadsPorOrigem?: LeadPorOrigem[];
  isLoading: boolean;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export function DashboardCharts({
  vendasPorDia,
  produtosMaisVendidos,
  leadsPorOrigem,
  isLoading,
}: DashboardChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Vendas por Dia */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Vendas</CardTitle>
        </CardHeader>
        <CardContent>
          {vendasPorDia && vendasPorDia.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip
                  formatter={(value: number) =>
                    new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(value)
                  }
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="valor"
                  stroke="#8884d8"
                  strokeWidth={2}
                  name="Vendas (R$)"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhuma venda registrada neste período
            </div>
          )}
        </CardContent>
      </Card>

      {/* Produtos Mais Vendidos */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Produtos Mais Vendidos</CardTitle>
        </CardHeader>
        <CardContent>
          {produtosMaisVendidos && produtosMaisVendidos.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={produtosMaisVendidos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantidade" fill="#8884d8" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum produto vendido neste período
            </div>
          )}
        </CardContent>
      </Card>

      {/* Leads por Origem */}
      <Card>
        <CardHeader>
          <CardTitle>Origem dos Leads</CardTitle>
        </CardHeader>
        <CardContent>
          {leadsPorOrigem && leadsPorOrigem.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={leadsPorOrigem}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ origem, percent }) =>
                    `${origem} (${(percent * 100).toFixed(0)}%)`
                  }
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {leadsPorOrigem.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum lead cadastrado
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quantidade de Pedidos */}
      <Card>
        <CardHeader>
          <CardTitle>Quantidade de Pedidos</CardTitle>
        </CardHeader>
        <CardContent>
          {vendasPorDia && vendasPorDia.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={vendasPorDia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="data" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="quantidade" fill="#00C49F" name="Pedidos" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum pedido registrado neste período
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
