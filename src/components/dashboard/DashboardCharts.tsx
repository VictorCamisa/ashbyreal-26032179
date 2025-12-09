import { TrendingUp, Package, Users, ShoppingCart, BarChart3, PieChart as PieChartIcon } from 'lucide-react';
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
  ResponsiveContainer,
} from 'recharts';
import { VendasPorDia, ProdutoMaisVendido, LeadPorOrigem } from '@/hooks/useDashboard';

interface DashboardChartsProps {
  vendasPorDia?: VendasPorDia[];
  produtosMaisVendidos?: ProdutoMaisVendido[];
  leadsPorOrigem?: LeadPorOrigem[];
  isLoading: boolean;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export function DashboardCharts({
  vendasPorDia,
  produtosMaisVendidos,
  leadsPorOrigem,
  isLoading,
}: DashboardChartsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass-card p-6 animate-pulse">
            <div className="h-5 w-40 bg-muted/50 rounded mb-6" />
            <div className="h-[280px] w-full bg-muted/30 rounded-2xl" />
          </div>
        ))}
      </div>
    );
  }

  const chartCardClass = "glass-card p-6";
  const chartTitleClass = "flex items-center gap-2 mb-6";
  const emptyStateClass = "h-[280px] flex flex-col items-center justify-center text-muted-foreground gap-2";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Vendas por Dia */}
      <div className={chartCardClass}>
        <div className={chartTitleClass}>
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-4 w-4 text-primary" />
          </div>
          <h3 className="font-medium">Evolução de Vendas</h3>
        </div>
        {vendasPorDia && vendasPorDia.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={vendasPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="data" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `R$${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
                formatter={(value: number) =>
                  new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(value)
                }
              />
              <Line
                type="monotone"
                dataKey="valor"
                stroke="hsl(var(--primary))"
                strokeWidth={2.5}
                dot={{ fill: 'hsl(var(--primary))', strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
                name="Vendas"
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className={emptyStateClass}>
            <TrendingUp className="h-10 w-10 text-muted-foreground/30" />
            <span className="text-sm">Nenhuma venda registrada</span>
          </div>
        )}
      </div>

      {/* Produtos Mais Vendidos */}
      <div className={chartCardClass}>
        <div className={chartTitleClass}>
          <div className="h-8 w-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Package className="h-4 w-4 text-violet-500" />
          </div>
          <h3 className="font-medium">Top 5 Produtos</h3>
        </div>
        {produtosMaisVendidos && produtosMaisVendidos.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={produtosMaisVendidos} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
              <XAxis 
                type="number" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                type="category" 
                dataKey="nome" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
                width={100}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Bar 
                dataKey="quantidade" 
                fill="hsl(var(--chart-2))" 
                radius={[0, 8, 8, 0]}
                name="Quantidade"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className={emptyStateClass}>
            <Package className="h-10 w-10 text-muted-foreground/30" />
            <span className="text-sm">Nenhum produto vendido</span>
          </div>
        )}
      </div>

      {/* Leads por Origem */}
      <div className={chartCardClass}>
        <div className={chartTitleClass}>
          <div className="h-8 w-8 rounded-xl bg-cyan-500/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-cyan-500" />
          </div>
          <h3 className="font-medium">Origem dos Leads</h3>
        </div>
        {leadsPorOrigem && leadsPorOrigem.length > 0 ? (
          <div className="flex items-center">
            <ResponsiveContainer width="60%" height={280}>
              <PieChart>
                <Pie
                  data={leadsPorOrigem}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={4}
                  dataKey="total"
                >
                  {leadsPorOrigem.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {leadsPorOrigem.map((item, index) => (
                <div key={item.origem} className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-sm text-muted-foreground">{item.origem}</span>
                  <span className="text-sm font-medium ml-auto">{item.total}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className={emptyStateClass}>
            <Users className="h-10 w-10 text-muted-foreground/30" />
            <span className="text-sm">Nenhum lead cadastrado</span>
          </div>
        )}
      </div>

      {/* Quantidade de Pedidos */}
      <div className={chartCardClass}>
        <div className={chartTitleClass}>
          <div className="h-8 w-8 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 text-emerald-500" />
          </div>
          <h3 className="font-medium">Pedidos por Dia</h3>
        </div>
        {vendasPorDia && vendasPorDia.length > 0 ? (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={vendasPorDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="data" 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))" 
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '12px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Bar 
                dataKey="quantidade" 
                fill="hsl(var(--chart-3))" 
                radius={[8, 8, 0, 0]}
                name="Pedidos"
              />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className={emptyStateClass}>
            <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
            <span className="text-sm">Nenhum pedido registrado</span>
          </div>
        )}
      </div>
    </div>
  );
}
