import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDashboard } from '@/hooks/useDashboard';
import { DashboardKPIs } from '@/components/dashboard/DashboardKPIs';
import { DashboardCharts } from '@/components/dashboard/DashboardCharts';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { TrendingUp, AlertTriangle, Target, ShoppingCart } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const [mesReferencia, setMesReferencia] = useState(new Date());
  const {
    dashboardData,
    vendasPorDia,
    produtosMaisVendidos,
    leadsPorOrigem,
    isLoading,
  } = useDashboard(mesReferencia);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Centro de Inteligência Ashby</p>
        </div>
        <DashboardFilters mesReferencia={mesReferencia} onMesChange={setMesReferencia} />
      </div>

      {/* KPIs */}
      <DashboardKPIs data={dashboardData} isLoading={isLoading} />

      {/* Gráficos */}
      <DashboardCharts
        vendasPorDia={vendasPorDia}
        produtosMaisVendidos={produtosMaisVendidos}
        leadsPorOrigem={leadsPorOrigem}
        isLoading={isLoading}
      />

      {/* Insights Automáticos */}
      <Card>
        <CardHeader>
          <CardTitle>Insights Automáticos</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : dashboardData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <TrendingUp className="h-5 w-5 text-green-500 mt-0.5" />
                <div>
                  <p className="font-medium">Crescimento de Vendas</p>
                  <p className="text-sm text-muted-foreground">
                    {dashboardData.vendas.crescimento >= 0
                      ? `Suas vendas cresceram ${dashboardData.vendas.crescimento.toFixed(1)}% em relação ao mês anterior`
                      : `Suas vendas tiveram uma queda de ${Math.abs(dashboardData.vendas.crescimento).toFixed(1)}% em relação ao mês anterior`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <Target className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Conversão de Leads</p>
                  <p className="text-sm text-muted-foreground">
                    Taxa de conversão de {dashboardData.leads.conversao.toFixed(1)}% com {dashboardData.leads.total} leads ativos
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <AlertTriangle
                  className={`h-5 w-5 mt-0.5 ${
                    dashboardData.estoque.alertas > 0 ? 'text-orange-500' : 'text-green-500'
                  }`}
                />
                <div>
                  <p className="font-medium">Status do Estoque</p>
                  <p className="text-sm text-muted-foreground">
                    {dashboardData.estoque.alertas > 0
                      ? `${dashboardData.estoque.alertas} produtos com estoque baixo requerem atenção`
                      : 'Todos os produtos estão com estoque adequado'}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-lg border bg-card">
                <ShoppingCart className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Novos Clientes</p>
                  <p className="text-sm text-muted-foreground">
                    {dashboardData.clientes.novos} novos clientes cadastrados este mês
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
