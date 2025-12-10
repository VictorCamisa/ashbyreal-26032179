import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { 
  DollarSign, 
  Users, 
  Target, 
  Package, 
  TrendingUp,
  TrendingDown,
  CreditCard,
  ShoppingCart
} from 'lucide-react';
import { EnhancedDashboardData } from '@/hooks/useDashboardEnhanced';

interface EnhancedKPIsProps {
  data?: EnhancedDashboardData;
  isLoading: boolean;
}

export function EnhancedKPIs({ data, isLoading }: EnhancedKPIsProps) {
  if (isLoading) {
    return (
      <KPIGrid>
        {[...Array(8)].map((_, i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-3" />
            <div className="h-7 w-24 bg-muted rounded mb-2" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
        ))}
      </KPIGrid>
    );
  }

  if (!data) return null;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      notation: value >= 10000 ? 'compact' : 'standard',
    }).format(value);

  const kpis = [
    {
      label: 'Vendas',
      value: formatCurrency(data.vendas.total),
      icon: ShoppingCart,
      trend: data.vendas.crescimento !== 0 ? {
        value: Math.abs(data.vendas.crescimento),
        isPositive: data.vendas.crescimento >= 0,
      } : undefined,
      subtitle: `${data.vendas.quantidade} pedidos`,
      variant: 'emerald' as const,
    },
    {
      label: 'Receitas',
      value: formatCurrency(data.financeiro.receitas),
      icon: TrendingUp,
      trend: data.financeiro.receitasCrescimento !== 0 ? {
        value: Math.abs(data.financeiro.receitasCrescimento),
        isPositive: data.financeiro.receitasCrescimento >= 0,
      } : undefined,
      subtitle: 'do mês',
      variant: 'blue' as const,
    },
    {
      label: 'Despesas',
      value: formatCurrency(data.financeiro.despesas),
      icon: TrendingDown,
      trend: data.financeiro.despesasCrescimento !== 0 ? {
        value: Math.abs(data.financeiro.despesasCrescimento),
        isPositive: data.financeiro.despesasCrescimento <= 0, // Inverted: less expense is positive
      } : undefined,
      subtitle: 'do mês',
      variant: 'rose' as const,
    },
    {
      label: 'Resultado',
      value: formatCurrency(data.financeiro.resultado),
      icon: DollarSign,
      subtitle: data.financeiro.resultado >= 0 ? 'superávit' : 'déficit',
      variant: data.financeiro.resultado >= 0 ? 'emerald' as const : 'rose' as const,
    },
    {
      label: 'Clientes',
      value: data.clientes.total.toString(),
      icon: Users,
      trend: data.clientes.crescimento !== 0 ? {
        value: Math.abs(data.clientes.crescimento),
        isPositive: data.clientes.crescimento >= 0,
      } : undefined,
      subtitle: `+${data.clientes.novos} novos`,
      variant: 'violet' as const,
    },
    {
      label: 'Leads',
      value: data.leads.total.toString(),
      icon: Target,
      subtitle: `${data.leads.conversao.toFixed(1)}% conversão`,
      variant: 'cyan' as const,
    },
    {
      label: 'Estoque',
      value: formatCurrency(data.estoque.valor),
      icon: Package,
      subtitle: `${data.estoque.total} unidades`,
      variant: data.estoque.alertas > 0 ? 'amber' as const : 'default' as const,
    },
    {
      label: 'Cartões',
      value: formatCurrency(data.financeiro.valorFaturas),
      icon: CreditCard,
      subtitle: `${data.financeiro.faturasAbertas} faturas abertas`,
      variant: 'default' as const,
    },
  ];

  return (
    <KPIGrid>
      {kpis.map((kpi) => (
        <KPICard key={kpi.label} {...kpi} />
      ))}
    </KPIGrid>
  );
}
