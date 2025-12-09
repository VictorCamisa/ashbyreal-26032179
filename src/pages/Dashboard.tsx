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
      color: dashboardData.vendas.crescimento >= 0 ? 'text-emerald-500' : 'text-rose-500',
      bgColor: dashboardData.vendas.crescimento >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10',
      title: 'Vendas',
      description: dashboardData.vendas.crescimento >= 0
        ? `+${dashboardData.vendas.crescimento.toFixed(1)}% vs mês anterior`
        : `${dashboardData.vendas.crescimento.toFixed(1)}% vs mês anterior`,
    },
    {
      icon: Target,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
      title: 'Conversão',
      description: `${dashboardData.leads.conversao.toFixed(1)}% com ${dashboardData.leads.total} leads`,
    },
    {
      icon: AlertTriangle,
      color: dashboardData.estoque.alertas > 0 ? 'text-amber-500' : 'text-emerald-500',
      bgColor: dashboardData.estoque.alertas > 0 ? 'bg-amber-500/10' : 'bg-emerald-500/10',
      title: 'Estoque',
      description: dashboardData.estoque.alertas > 0
        ? `${dashboardData.estoque.alertas} produtos com estoque baixo`
        : 'Estoque adequado',
    },
    {
      icon: ShoppingCart,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
      title: 'Clientes',
      description: `${dashboardData.clientes.novos} novos este mês`,
    },
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <LayoutDashboard className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Dashboard</h1>
            <p className="text-muted-foreground">Visão geral do seu negócio</p>
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
        <section className="glass-card p-6">
          <h2 className="font-semibold mb-5">Insights do Período</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {insights.map((insight) => (
              <div 
                key={insight.title} 
                className="flex items-start gap-4 p-4 rounded-xl bg-muted/30 border border-border/50"
              >
                <div className={`h-10 w-10 rounded-xl ${insight.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <insight.icon className={`h-5 w-5 ${insight.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium">{insight.title}</p>
                  <p className="text-sm text-muted-foreground">{insight.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
