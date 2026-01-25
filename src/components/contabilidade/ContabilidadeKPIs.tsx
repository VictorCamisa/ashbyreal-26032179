import { FileText, ArrowDownCircle, ArrowUpCircle, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import { KPICard } from '@/components/layout/KPICard';
import { ContabilidadeStats } from '@/hooks/useContabilidade';
import { Skeleton } from '@/components/ui/skeleton';

interface ContabilidadeKPIsProps {
  stats: ContabilidadeStats | undefined;
  isLoading: boolean;
}

export function ContabilidadeKPIs({ stats, isLoading }: ContabilidadeKPIsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: 'compact',
    }).format(value);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total Docs',
      value: stats?.totalDocumentos || 0,
      icon: FileText,
      color: 'text-blue-500',
    },
    {
      title: 'Emitidas',
      value: stats?.emitidas || 0,
      icon: CheckCircle,
      color: 'text-green-500',
    },
    {
      title: 'Pendentes',
      value: stats?.pendentes || 0,
      icon: Clock,
      color: 'text-amber-500',
    },
    {
      title: 'Entradas',
      value: formatCurrency(stats?.valorTotalEntradas || 0),
      icon: ArrowDownCircle,
      color: 'text-emerald-500',
      subtitle: `${stats?.entradas || 0} docs`,
    },
    {
      title: 'Saídas',
      value: formatCurrency(stats?.valorTotalSaidas || 0),
      icon: ArrowUpCircle,
      color: 'text-red-500',
      subtitle: `${stats?.saidas || 0} docs`,
    },
    {
      title: 'Alertas',
      value: stats?.alertasPendentes || 0,
      icon: AlertTriangle,
      color: (stats?.alertasPendentes || 0) > 0 ? 'text-red-500' : 'text-muted-foreground',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {kpis.map((kpi, index) => (
        <KPICard
          key={kpi.title}
          label={kpi.title}
          value={kpi.value}
          icon={kpi.icon}
          subtitle={kpi.subtitle}
          animationDelay={index * 50}
        />
      ))}
    </div>
  );
}
