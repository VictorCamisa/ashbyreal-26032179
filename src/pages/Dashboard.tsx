import { useState } from 'react';
import { useDashboardEnhanced } from '@/hooks/useDashboardEnhanced';
import { PageLayout } from '@/components/layout/PageLayout';
import { EnhancedKPIs } from '@/components/dashboard/EnhancedKPIs';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { LeadFunnelChart } from '@/components/dashboard/LeadFunnelChart';
import { RankingsPanel } from '@/components/dashboard/RankingsPanel';
import { PedidosTimeline } from '@/components/dashboard/PedidosTimeline';
import { WhatsAppStatus } from '@/components/dashboard/WhatsAppStatus';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { HealthGauge } from '@/components/financeiro/HealthGauge';
import { EvolutionChart } from '@/components/financeiro/EvolutionChart';
import { useFinanceiroStats } from '@/hooks/useFinanceiroStats';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LayoutDashboard,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const [mesReferencia, setMesReferencia] = useState(new Date());
  const [entityFilter, setEntityFilter] = useState<'all' | 'LOJA' | 'PARTICULAR'>('all');
  
  const {
    dashboardData,
    cashFlowForecast,
    leadFunnel,
    isLoading,
    refetch,
  } = useDashboardEnhanced(mesReferencia, entityFilter);

  const { evolutionData, alertStats } = useFinanceiroStats(mesReferencia);

  const handlePrevMonth = () => {
    setMesReferencia(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setMesReferencia(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const monthLabel = format(mesReferencia, 'MMMM yyyy', { locale: ptBR });

  return (
    <PageLayout
      title="Dashboard"
      subtitle="Visão geral completa do seu negócio"
      icon={LayoutDashboard}
      showSparkle
      actions={
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-xl p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize px-2 min-w-[100px] text-center">
              {monthLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Entity Filter */}
          <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v as any)}>
            <SelectTrigger className="w-[120px] h-9 rounded-xl">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="LOJA">Loja</SelectItem>
              <SelectItem value="PARTICULAR">Particular</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button variant="outline" size="icon" className="h-9 w-9 rounded-xl" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Quick Actions */}
          <QuickActions />
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPIs Grid */}
        <EnhancedKPIs data={dashboardData} isLoading={isLoading} />

        {/* Alerts + WhatsApp Row */}
        {dashboardData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <AlertsPanel
                atrasadas={dashboardData.financeiro.atrasadas}
                valorAtrasado={dashboardData.financeiro.valorAtrasado}
                pendentes={dashboardData.financeiro.pendentes7dias}
                valorPendente={dashboardData.financeiro.valorPendente}
                faturasAbertas={dashboardData.financeiro.faturasAbertas}
                valorFaturas={dashboardData.financeiro.valorFaturas}
                alertasEstoque={dashboardData.estoque.alertas}
                produtosEmAlerta={dashboardData.estoque.produtosEmAlerta}
              />
            </div>
            <WhatsAppStatus
              isConnected={dashboardData.whatsapp.isConnected}
              conversasAtivas={dashboardData.whatsapp.conversasAtivas}
              naoLidas={dashboardData.whatsapp.naoLidas}
            />
          </div>
        )}

        {/* Financial Health + Evolution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dashboardData && (
            <HealthGauge
              receitas={dashboardData.financeiro.receitas}
              despesas={dashboardData.financeiro.despesas}
              transacoesAtrasadas={dashboardData.financeiro.atrasadas}
              faturasAbertas={dashboardData.financeiro.faturasAbertas}
            />
          )}
          <EvolutionChart data={evolutionData} />
        </div>

        {/* Cash Flow + Lead Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <CashFlowChart data={cashFlowForecast} />
          {dashboardData && (
            <LeadFunnelChart
              data={leadFunnel}
              totalLeads={dashboardData.leads.total}
              taxaConversao={dashboardData.leads.conversao}
            />
          )}
        </div>

        {/* Rankings + Pedidos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {dashboardData && (
            <>
              <RankingsPanel
                topClientes={dashboardData.topClientes}
                topProdutos={dashboardData.topProdutos}
                topCategorias={dashboardData.topCategoriasDespesa}
              />
              <PedidosTimeline
                total={dashboardData.pedidos.total}
                pendentes={dashboardData.pedidos.pendentes}
                emAndamento={dashboardData.pedidos.emAndamento}
                valorPendente={dashboardData.pedidos.valorPendente}
                byStatus={dashboardData.pedidos.byStatus}
              />
            </>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
