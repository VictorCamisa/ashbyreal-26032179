import { useState } from 'react';
import { useDashboardEnhanced } from '@/hooks/useDashboardEnhanced';
import { PageHeader } from '@/components/layout/PageHeader';
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <PageHeader
        title="Dashboard"
        subtitle="Visão geral completa do seu negócio"
        icon={LayoutDashboard}
        actions={
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* Month Navigation - Always visible */}
            <div className="flex items-center gap-0.5 sm:gap-1 bg-muted/50 rounded-lg p-0.5 sm:p-1">
              <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={handlePrevMonth}>
                <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
              <span className="text-xs sm:text-sm font-medium capitalize min-w-[80px] sm:min-w-[110px] text-center">
                {monthLabel}
              </span>
              <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-7 sm:w-7" onClick={handleNextMonth}>
                <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
              </Button>
            </div>

            {/* Entity Filter - Hidden on very small screens */}
            <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v as any)}>
              <SelectTrigger className="w-[90px] sm:w-[130px] h-7 sm:h-8 text-xs sm:text-sm">
                <Filter className="h-3 w-3 mr-1 hidden sm:block" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="LOJA">Loja</SelectItem>
                <SelectItem value="PARTICULAR">Particular</SelectItem>
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => refetch()}>
              <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>

            {/* Quick Actions */}
            <div className="hidden sm:block">
              <QuickActions />
            </div>
          </div>
        }
      />

      {/* KPIs Grid */}
      <EnhancedKPIs data={dashboardData} isLoading={isLoading} />

      {/* Alerts + WhatsApp Row */}
      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
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
  );
}
