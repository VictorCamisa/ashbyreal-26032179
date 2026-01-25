import { useState } from 'react';
import { format, subMonths, addMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Calculator, Settings } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { Button } from '@/components/ui/button';
import { ContabilidadeKPIs } from '@/components/contabilidade/ContabilidadeKPIs';
import { ContabilidadeAlertas } from '@/components/contabilidade/ContabilidadeAlertas';
import { DocumentosFiscaisTable } from '@/components/contabilidade/DocumentosFiscaisTable';
import { PendenciasPanel } from '@/components/contabilidade/PendenciasPanel';
import { useContabilidadeStats } from '@/hooks/useContabilidade';

export default function Contabilidade() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const monthStr = format(currentMonth, 'yyyy-MM');
  const { data: stats, isLoading } = useContabilidadeStats(monthStr);

  const monthLabel = format(currentMonth, 'MMMM yyyy', { locale: ptBR });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <PageLayout
      title="Contabilidade"
      subtitle="Gestão fiscal e emissão de notas"
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

          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Configurações</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPIs */}
        <ContabilidadeKPIs stats={stats} isLoading={isLoading} />

        {/* Alertas e Pendências */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ContabilidadeAlertas />
          <PendenciasPanel />
        </div>

        {/* Tabela de Documentos */}
        <DocumentosFiscaisTable />
      </div>
    </PageLayout>
  );
}
