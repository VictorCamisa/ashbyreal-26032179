import { useState } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calculator, Settings, LayoutDashboard, FileText } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfiguracoesContabilidadeDialog } from '@/components/contabilidade/ConfiguracoesContabilidadeDialog';
import { KPIsFiscais } from '@/components/contabilidade/KPIsFiscais';
import { ReconciliacaoPanel } from '@/components/contabilidade/ReconciliacaoPanel';
import { DREFiscal } from '@/components/contabilidade/DREFiscal';
import { FluxoCaixaFiscal } from '@/components/contabilidade/FluxoCaixaFiscal';
import { PendenciasDetalhadas } from '@/components/contabilidade/PendenciasDetalhadas';
import { DocumentosFiscaisTable } from '@/components/contabilidade/DocumentosFiscaisTable';
import { useFiscalMetrics } from '@/hooks/useFiscalMetrics';
import { formatMonthYear } from '@/lib/dateUtils';

export default function Contabilidade() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [configOpen, setConfigOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const monthStr = format(currentMonth, 'yyyy-MM');
  const { data: metrics, isLoading } = useFiscalMetrics(monthStr);
  const monthLabel = formatMonthYear(currentMonth);

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <PageLayout
      title="Contabilidade"
      subtitle="Controle fiscal extremo - Reconciliação e análise"
      icon={Calculator}
      actions={
        <div className="flex items-center gap-2">
          {/* Month Navigation */}
          <div className="flex items-center bg-secondary rounded-lg p-0.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handlePrevMonth}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center capitalize">
              {monthLabel}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleNextMonth}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard Fiscal
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documentos
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Fiscal */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPIs Avançados */}
          <KPIsFiscais
            gapFiscalEntradas={metrics?.gapEntradas || 0}
            gapFiscalSaidas={metrics?.gapSaidas || 0}
            margemFiscal={metrics?.margemFiscal || 0}
            creditoICMS={metrics?.creditoICMS || 0}
            debitoICMS={metrics?.debitoICMS || 0}
            coberturaDocumental={metrics?.coberturaDocumental || 100}
            totalPendencias={metrics?.totalPendencias || 0}
            isLoading={isLoading}
          />

          {/* Painel de Reconciliação */}
          <ReconciliacaoPanel
            totalEntradas={metrics?.totalBoletos || 0}
            totalSaidas={metrics?.totalPedidos || 0}
            entradasComNF={metrics?.boletosComNF || 0}
            saidasComNF={metrics?.pedidosComNF || 0}
            isLoading={isLoading}
          />

          {/* DRE e Fluxo */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <DREFiscal
              receitaBruta={metrics?.receitaBruta || 0}
              impostosSaida={metrics?.impostosSaida || 0}
              custoMercadorias={metrics?.custoMercadorias || 0}
              impostosEntrada={metrics?.impostosEntrada || 0}
              isLoading={isLoading}
            />
            <FluxoCaixaFiscal
              dados={metrics?.fluxoDiario || []}
              isLoading={isLoading}
            />
          </div>

          {/* Pendências Detalhadas */}
          <PendenciasDetalhadas
            pendencias={metrics?.pendencias || []}
            isLoading={isLoading}
          />
        </TabsContent>

        {/* Documentos Fiscais */}
        <TabsContent value="documentos" className="space-y-6">
          <DocumentosFiscaisTable />
        </TabsContent>
      </Tabs>

      <ConfiguracoesContabilidadeDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
      />
    </PageLayout>
  );
}
