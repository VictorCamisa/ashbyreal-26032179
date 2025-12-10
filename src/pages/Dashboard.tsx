import { useState } from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  ShoppingCart, 
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [mesReferencia, setMesReferencia] = useState(new Date());
  const {
    dashboardData,
    vendasPorDia,
    produtosMaisVendidos,
    leadsPorOrigem,
    isLoading,
  } = useDashboard(mesReferencia);

  const handlePrevMonth = () => {
    setMesReferencia(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setMesReferencia(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthLabel = format(mesReferencia, 'MMMM yyyy', { locale: ptBR });

  const insights = dashboardData ? [
    {
      icon: TrendingUp,
      color: dashboardData.vendas.crescimento >= 0 ? 'text-emerald-600' : 'text-destructive',
      bgColor: dashboardData.vendas.crescimento >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30',
      title: 'Vendas',
      description: dashboardData.vendas.crescimento >= 0
        ? `+${dashboardData.vendas.crescimento.toFixed(1)}% vs mês anterior`
        : `${dashboardData.vendas.crescimento.toFixed(1)}% vs mês anterior`,
    },
    {
      icon: Target,
      color: 'text-violet-600',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
      title: 'Conversão',
      description: `${dashboardData.leads.conversao.toFixed(1)}% com ${dashboardData.leads.total} leads`,
    },
    {
      icon: AlertTriangle,
      color: dashboardData.estoque.alertas > 0 ? 'text-amber-600' : 'text-emerald-600',
      bgColor: dashboardData.estoque.alertas > 0 ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-emerald-100 dark:bg-emerald-900/30',
      title: 'Estoque',
      description: dashboardData.estoque.alertas > 0
        ? `${dashboardData.estoque.alertas} produtos com estoque baixo`
        : 'Estoque adequado',
    },
    {
      icon: ShoppingCart,
      color: 'text-cyan-600',
      bgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
      title: 'Clientes',
      description: `${dashboardData.clientes.novos} novos este mês`,
    },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral do seu negócio"
        icon={LayoutDashboard}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[120px] text-center">
              {monthLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        }
      />

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
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Insights do Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {insights.map((insight) => (
                <div 
                  key={insight.title} 
                  className="flex items-start gap-3 p-3 rounded-xl bg-muted/30 border border-border/50"
                >
                  <div className={`h-9 w-9 rounded-lg ${insight.bgColor} flex items-center justify-center flex-shrink-0`}>
                    <insight.icon className={`h-4 w-4 ${insight.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{insight.title}</p>
                    <p className="text-xs text-muted-foreground">{insight.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
