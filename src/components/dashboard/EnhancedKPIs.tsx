import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Package,
  CreditCard
} from 'lucide-react';
import { EnhancedDashboardData } from '@/hooks/useDashboardEnhanced';

interface EnhancedKPIsProps {
  data?: EnhancedDashboardData;
  isLoading: boolean;
}

export function EnhancedKPIs({ data, isLoading }: EnhancedKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="rounded-xl bg-card border border-border/60 p-5 shadow-sm">
            <div className="space-y-3">
              <div className="h-3 w-20 bg-muted rounded animate-pulse" />
              <div className="h-7 w-28 bg-muted rounded animate-pulse" />
              <div className="h-3 w-16 bg-muted rounded animate-pulse" />
            </div>
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
      maximumFractionDigits: value >= 10000 ? 1 : 2,
    }).format(value);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Row 1 */}
      <KPICard
        label="Vendas do Mês"
        value={formatCurrency(data.vendas.total)}
        icon={ShoppingCart}
        trend={data.vendas.crescimento !== 0 ? {
          value: Math.abs(data.vendas.crescimento),
          isPositive: data.vendas.crescimento >= 0,
        } : undefined}
        subtitle={`${data.vendas.quantidade} pedidos`}
        animationDelay={0}
      />
      <KPICard
        label="Resultado"
        value={formatCurrency(data.financeiro.resultado)}
        icon={DollarSign}
        subtitle={data.financeiro.resultado >= 0 ? 'superávit' : 'déficit'}
        animationDelay={50}
      />
      <KPICard
        label="Receitas"
        value={formatCurrency(data.financeiro.receitas)}
        icon={TrendingUp}
        trend={data.financeiro.receitasCrescimento !== 0 ? {
          value: Math.abs(data.financeiro.receitasCrescimento),
          isPositive: data.financeiro.receitasCrescimento >= 0,
        } : undefined}
        subtitle="do mês"
        animationDelay={100}
      />
      <KPICard
        label="Despesas"
        value={formatCurrency(data.financeiro.despesas)}
        icon={TrendingDown}
        trend={data.financeiro.despesasCrescimento !== 0 ? {
          value: Math.abs(data.financeiro.despesasCrescimento),
          isPositive: data.financeiro.despesasCrescimento <= 0,
        } : undefined}
        subtitle="do mês"
        animationDelay={150}
      />
      
      {/* Row 2 */}
      <KPICard
        label="Clientes"
        value={data.clientes.total.toString()}
        icon={Users}
        trend={data.clientes.crescimento !== 0 ? {
          value: Math.abs(data.clientes.crescimento),
          isPositive: data.clientes.crescimento >= 0,
        } : undefined}
        subtitle={`+${data.clientes.novos} novos`}
        animationDelay={200}
      />
      <KPICard
        label="Leads"
        value={data.leads.total.toString()}
        icon={Target}
        subtitle={`${data.leads.conversao.toFixed(1)}% conversão`}
        animationDelay={250}
      />
      <KPICard
        label="Estoque"
        value={formatCurrency(data.estoque.valor)}
        icon={Package}
        subtitle={`${data.estoque.total} unidades`}
        animationDelay={300}
      />
      <KPICard
        label="Cartões"
        value={formatCurrency(data.financeiro.valorFaturas)}
        icon={CreditCard}
        subtitle={`${data.financeiro.faturasAbertas} faturas`}
        animationDelay={350}
      />
    </div>
  );
}
