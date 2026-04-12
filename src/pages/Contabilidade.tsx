import { useState } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ChevronLeft, ChevronRight, Calculator, Settings, LayoutDashboard, FileText, ShieldCheck } from 'lucide-react';
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
import { ValidacaoAPIDialog } from '@/components/contabilidade/ValidacaoAPIDialog';

export default function Contabilidade() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [configOpen, setConfigOpen] = useState(false);
  const [validacaoOpen, setValidacaoOpen] = useState(false);
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

          <Button variant="outline" size="sm" onClick={() => setValidacaoOpen(true)} className="text-amber-600 border-amber-500/30 hover:bg-amber-500/10">
            <ShieldCheck className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Validação de API</span>
          </Button>

          <Button variant="outline" size="sm" onClick={() => setConfigOpen(true)}>
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="grid w-full min-w-[300px] max-w-md grid-cols-2">
            <TabsTrigger value="dashboard" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Dashboard</span> Fiscal
            </TabsTrigger>
            <TabsTrigger value="documentos" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm">
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Documentos
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Dashboard Fiscal */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* KPIs Avançados */}
          <KPIsFiscais
            totalEntradas={metrics?.totalEntradas || 0}
            entradasComNF={metrics?.entradasComNF || 0}
            entradasSemNF={metrics?.entradasSemNF || 0}
            totalSaidas={metrics?.totalSaidas || 0}
            saidasComNF={(metrics?.saidasComNFe || 0) + (metrics?.saidasComCupom || 0)}
            saidasSemNF={metrics?.saidasSemNF || 0}
            gapFiscal={metrics?.gapFiscal || 0}
            totalPendencias={metrics?.totalPendencias || 0}
            isLoading={isLoading}
          />

          {/* Painel de Reconciliação */}
          <ReconciliacaoPanel
            totalEntradas={metrics?.totalEntradas || 0}
            entradasComNF={metrics?.entradasComNF || 0}
            entradasSemNF={metrics?.entradasSemNF || 0}
            totalSaidas={metrics?.totalSaidas || 0}
            saidasComNFe={metrics?.saidasComNFe || 0}
            saidasComCupom={metrics?.saidasComCupom || 0}
            saidasSemNF={metrics?.saidasSemNF || 0}
            gapFiscal={metrics?.gapFiscal || 0}
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

      <ValidacaoAPIDialog
        open={validacaoOpen}
        onOpenChange={setValidacaoOpen}
      />
    </PageLayout>
  );
}
