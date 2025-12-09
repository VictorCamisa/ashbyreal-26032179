import { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { TrendingUp, AlertTriangle, Target, ShoppingCart, LayoutDashboard } from 'lucide-react';

export default function Dashboard() {
  const [mesReferencia, setMesReferencia] = useState(new Date());
  const {
    dashboardData,
    vendasPorDia,
    produtosMaisVendidos,
    leadsPorOrigem,
    isLoading,
  } = useDashboard(mesReferencia);

  const insights = dashboardData ? [
    {
      icon: TrendingUp,
      color: dashboardData.vendas.crescimento >= 0 ? 'text-primary' : 'text-destructive',
      bgColor: dashboardData.vendas.crescimento >= 0 ? 'bg-primary/10' : 'bg-destructive/10',
      title: 'Vendas',
      description: dashboardData.vendas.crescimento >= 0
        ? `+${dashboardData.vendas.crescimento.toFixed(1)}% vs mês anterior`
        : `${dashboardData.vendas.crescimento.toFixed(1)}% vs mês anterior`,
    },
    {
      icon: Target,
      color: 'text-chart-2',
      bgColor: 'bg-chart-2/10',
      title: 'Conversão',
      description: `${dashboardData.leads.conversao.toFixed(1)}% com ${dashboardData.leads.total} leads`,
    },
    {
      icon: AlertTriangle,
      color: dashboardData.estoque.alertas > 0 ? 'text-chart-4' : 'text-primary',
      bgColor: dashboardData.estoque.alertas > 0 ? 'bg-chart-4/10' : 'bg-primary/10',
      title: 'Estoque',
      description: dashboardData.estoque.alertas > 0
        ? `${dashboardData.estoque.alertas} produtos com estoque baixo`
        : 'Estoque adequado',
    },
    {
      icon: ShoppingCart,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
      title: 'Clientes',
      description: `${dashboardData.clientes.novos} novos este mês`,
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Dashboard</h1>
            <p className="text-sm text-muted-foreground">Visão geral do negócio</p>
          </div>
        </div>
        <DashboardFilters mesReferencia={mesReferencia} onMesChange={setMesReferencia} />
      </header>

      {/* KPIs */}
      <DashboardKPIs data={dashboardData} isLoading={isLoading} />

      {/* Charts */}
      <DashboardCharts
        vendasPorDia={vendasPorDia}
        produtosMaisVendidos={produtosMaisVendidos}
        leadsPorOrigem={leadsPorOrigem}
        isLoading={isLoading}
      />

      {/* Insights */}
      {!isLoading && dashboardData && (
        <section className="rounded-2xl border border-border/50 bg-card/50 p-5">
          <h2 className="text-sm font-semibold mb-4">Insights</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {insights.map((insight) => (
              <div 
                key={insight.title} 
                className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
              >
                <div className={`h-8 w-8 rounded-lg ${insight.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <insight.icon className={`h-4 w-4 ${insight.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}