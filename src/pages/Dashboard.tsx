import { useState, useEffect } from 'react';
import { useDashboardEnhanced } from '@/hooks/useDashboardEnhanced';
import { PageLayout } from '@/components/layout/PageLayout';
import { DashboardKPIsEnhanced } from '@/components/dashboard/DashboardKPIsEnhanced';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { CashFlowChart } from '@/components/dashboard/CashFlowChart';
import { LeadFunnelChart } from '@/components/dashboard/LeadFunnelChart';
import { RankingsPanel } from '@/components/dashboard/RankingsPanel';
import { PedidosTimeline } from '@/components/dashboard/PedidosTimeline';
import { WhatsAppStatus } from '@/components/dashboard/WhatsAppStatus';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { HealthGauge } from '@/components/financeiro/HealthGauge';
import { EvolutionChart } from '@/components/financeiro/EvolutionChart';
import { ComparisonChart } from '@/components/dashboard/ComparisonChart';
import { CategoryDonutChart } from '@/components/dashboard/CategoryDonutChart';
import { useFinanceiroStats } from '@/hooks/useFinanceiroStats';
import { TestarAgenteDialog } from '@/components/agentes/TestarAgenteDialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Bot,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface AIAgent {
  id: string;
  name: string;
  system_prompt: string;
  model: string;
  temperature: number;
  max_tokens: number;
  greeting_message: string | null;
  knowledge_tables: string[];
}

export default function Dashboard() {
  const [mesReferencia, setMesReferencia] = useState(new Date());
  const [entityFilter, setEntityFilter] = useState<'all' | 'LOJA' | 'PARTICULAR'>('all');
  const [showTestarAgente, setShowTestarAgente] = useState(false);
  const [activeAgent, setActiveAgent] = useState<AIAgent | null>(null);
  
  const {
    dashboardData,
    cashFlowForecast,
    leadFunnel,
    isLoading,
    refetch,
  } = useDashboardEnhanced(mesReferencia, entityFilter);

  const { evolutionData, alertStats } = useFinanceiroStats(mesReferencia);

  // Fetch active agent
  useEffect(() => {
    const fetchActiveAgent = async () => {
      const { data } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      if (data) {
        setActiveAgent(data as AIAgent);
      }
    };
    fetchActiveAgent();
  }, []);

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
      actions={
        <div className="flex items-center gap-2">
          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize px-2 min-w-[100px] text-center">
              {monthLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Entity Filter */}
          <Select value={entityFilter} onValueChange={(v) => setEntityFilter(v as any)}>
            <SelectTrigger className="w-[100px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="LOJA">Loja</SelectItem>
              <SelectItem value="PARTICULAR">Particular</SelectItem>
            </SelectContent>
          </Select>

          {/* Refresh */}
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>

          {/* Test Agent Button */}
          {activeAgent && (
            <Button 
              variant="outline" 
              size="sm" 
              className="gap-2"
              onClick={() => setShowTestarAgente(true)}
            >
              <Bot className="h-4 w-4" />
              Testar Agente
            </Button>
          )}

          {/* Quick Actions */}
          <QuickActions />
        </div>
      }
    >
      <div className="space-y-6">
        {/* Enhanced KPIs Grid - 3 rows of interactive cards */}
        <DashboardKPIsEnhanced data={dashboardData} isLoading={isLoading} />

        {/* Alerts + WhatsApp Row */}
        {dashboardData && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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

        {/* Charts Row - Comparison + Category Distribution */}
        {dashboardData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ComparisonChart
              receitas={dashboardData.financeiro.receitas}
              despesas={dashboardData.financeiro.despesas}
              receitasAnterior={dashboardData.vendas.mesAnterior}
              despesasAnterior={dashboardData.vendas.mesAnterior * 0.7}
            />
            <CategoryDonutChart
              data={dashboardData.topCategoriasDespesa}
              title="Top Categorias de Despesa"
            />
          </div>
        )}

        {/* Financial Health + Evolution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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

      {/* Test Agent Dialog */}
      {activeAgent && (
        <TestarAgenteDialog
          agent={activeAgent}
          open={showTestarAgente}
          onOpenChange={setShowTestarAgente}
        />
      )}
    </PageLayout>
  );
}
