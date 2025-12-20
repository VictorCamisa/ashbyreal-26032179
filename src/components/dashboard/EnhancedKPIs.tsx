import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { EnhancedDashboardData } from '@/hooks/useDashboardEnhanced';

interface EnhancedKPIsProps {
  data?: EnhancedDashboardData;
  isLoading: boolean;
}

export function EnhancedKPIs({ data, isLoading }: EnhancedKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-y border rounded-lg bg-card">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 space-y-2">
            <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            <div className="h-6 w-24 bg-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: value >= 10000 ? 'compact' : 'standard',
    }).format(value);

  return (
    <KPIGrid columns={4}>
      <KPICard
        label="Vendas do Mês"
        value={formatCurrency(data.vendas.total)}
        trend={data.vendas.crescimento !== 0 ? {
          value: Math.abs(data.vendas.crescimento),
          isPositive: data.vendas.crescimento >= 0,
        } : undefined}
        subtitle={`${data.vendas.quantidade} pedidos`}
      />
      <KPICard
        label="Resultado"
        value={formatCurrency(data.financeiro.resultado)}
        subtitle={data.financeiro.resultado >= 0 ? 'superávit' : 'déficit'}
      />
      <KPICard
        label="Clientes"
        value={data.clientes.total.toString()}
        subtitle={`+${data.clientes.novos} novos`}
      />
      <KPICard
        label="Leads"
        value={data.leads.total.toString()}
        subtitle={`${data.leads.conversao.toFixed(1)}% conversão`}
      />
    </KPIGrid>
  );
}
