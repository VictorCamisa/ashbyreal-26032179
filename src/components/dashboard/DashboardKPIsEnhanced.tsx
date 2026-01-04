import { InteractiveKPICard } from './InteractiveKPICard';
import { 
  ShoppingCart, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Package,
  CreditCard,
  Wallet,
  AlertTriangle,
  CalendarClock,
  Receipt,
  BarChart3,
  Percent
} from 'lucide-react';
import { EnhancedDashboardData } from '@/hooks/useDashboardEnhanced';

interface DashboardKPIsEnhancedProps {
  data?: EnhancedDashboardData;
  isLoading: boolean;
}

export function DashboardKPIsEnhanced({ data, isLoading }: DashboardKPIsEnhancedProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="rounded-xl bg-card border border-border/60 p-5">
              <div className="space-y-3">
                <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                <div className="h-7 w-28 bg-muted rounded animate-pulse" />
                <div className="h-3 w-16 bg-muted rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
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

  const formatNumber = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      notation: value >= 10000 ? 'compact' : 'standard',
      maximumFractionDigits: 0,
    }).format(value);

  // Calculate ticket médio
  const ticketMedio = data.vendas.quantidade > 0 
    ? data.vendas.total / data.vendas.quantidade 
    : 0;

  // Calculate margin
  const margem = data.financeiro.receitas > 0 
    ? ((data.financeiro.receitas - data.financeiro.despesas) / data.financeiro.receitas) * 100 
    : 0;

  return (
    <div className="space-y-4">
      {/* Row 1 - Financial Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <InteractiveKPICard
          label="Receitas"
          value={formatCurrency(data.financeiro.receitas)}
          icon={TrendingUp}
          trend={data.financeiro.receitasCrescimento !== 0 ? {
            value: Math.abs(data.financeiro.receitasCrescimento),
            isPositive: data.financeiro.receitasCrescimento >= 0,
          } : undefined}
          subtitle="do mês"
          href="/financeiro"
          variant="success"
          animationDelay={0}
        />
        <InteractiveKPICard
          label="Despesas"
          value={formatCurrency(data.financeiro.despesas)}
          icon={TrendingDown}
          trend={data.financeiro.despesasCrescimento !== 0 ? {
            value: Math.abs(data.financeiro.despesasCrescimento),
            isPositive: data.financeiro.despesasCrescimento <= 0,
          } : undefined}
          subtitle="do mês"
          href="/financeiro"
          variant="danger"
          animationDelay={50}
        />
        <InteractiveKPICard
          label="Resultado"
          value={formatCurrency(data.financeiro.resultado)}
          icon={DollarSign}
          subtitle={data.financeiro.resultado >= 0 ? 'superávit' : 'déficit'}
          variant={data.financeiro.resultado >= 0 ? 'success' : 'danger'}
          animationDelay={100}
        />
        <InteractiveKPICard
          label="Margem"
          value={`${margem.toFixed(1)}%`}
          icon={Percent}
          subtitle="lucro líquido"
          variant={margem >= 20 ? 'success' : margem >= 0 ? 'warning' : 'danger'}
          animationDelay={150}
        />
        <InteractiveKPICard
          label="Cartões"
          value={formatCurrency(data.financeiro.valorFaturas)}
          icon={CreditCard}
          subtitle={`${data.financeiro.faturasAbertas} faturas abertas`}
          href="/financeiro"
          variant={data.financeiro.faturasAbertas > 0 ? 'warning' : 'default'}
          animationDelay={200}
        />
      </div>

      {/* Row 2 - Sales & Operations */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <InteractiveKPICard
          label="Vendas"
          value={formatCurrency(data.vendas.total)}
          icon={ShoppingCart}
          trend={data.vendas.crescimento !== 0 ? {
            value: Math.abs(data.vendas.crescimento),
            isPositive: data.vendas.crescimento >= 0,
          } : undefined}
          subtitle={`${data.vendas.quantidade} pedidos`}
          href="/pedidos"
          animationDelay={250}
        />
        <InteractiveKPICard
          label="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={Receipt}
          subtitle="por pedido"
          animationDelay={300}
        />
        <InteractiveKPICard
          label="Clientes"
          value={formatNumber(data.clientes.total)}
          icon={Users}
          trend={data.clientes.crescimento !== 0 ? {
            value: Math.abs(data.clientes.crescimento),
            isPositive: data.clientes.crescimento >= 0,
          } : undefined}
          subtitle={`+${data.clientes.novos} novos`}
          href="/clientes"
          animationDelay={350}
        />
        <InteractiveKPICard
          label="Leads"
          value={formatNumber(data.leads.total)}
          icon={Target}
          subtitle={`${data.leads.conversao.toFixed(1)}% conversão`}
          href="/crm"
          animationDelay={400}
        />
        <InteractiveKPICard
          label="Estoque"
          value={formatCurrency(data.estoque.valor)}
          icon={Package}
          subtitle={`${formatNumber(data.estoque.total)} unidades`}
          href="/estoque"
          variant={data.estoque.alertas > 0 ? 'warning' : 'default'}
          animationDelay={450}
        />
      </div>

      {/* Row 3 - Alerts & Pending Items */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <InteractiveKPICard
          label="Contas Atrasadas"
          value={data.financeiro.atrasadas.toString()}
          icon={AlertTriangle}
          subtitle={formatCurrency(data.financeiro.valorAtrasado)}
          href="/financeiro"
          variant={data.financeiro.atrasadas > 0 ? 'danger' : 'default'}
          animationDelay={500}
        />
        <InteractiveKPICard
          label="A Vencer (7d)"
          value={data.financeiro.pendentes7dias.toString()}
          icon={CalendarClock}
          subtitle={formatCurrency(data.financeiro.valorPendente)}
          href="/financeiro"
          variant={data.financeiro.pendentes7dias > 5 ? 'warning' : 'default'}
          animationDelay={550}
        />
        <InteractiveKPICard
          label="Pedidos Pendentes"
          value={data.pedidos.pendentes.toString()}
          icon={ShoppingCart}
          subtitle={formatCurrency(data.pedidos.valorPendente)}
          href="/pedidos"
          variant={data.pedidos.pendentes > 0 ? 'warning' : 'default'}
          animationDelay={600}
        />
        <InteractiveKPICard
          label="Produtos em Alerta"
          value={data.estoque.alertas.toString()}
          icon={Package}
          subtitle="baixo estoque"
          href="/estoque"
          variant={data.estoque.alertas > 0 ? 'danger' : 'default'}
          animationDelay={650}
        />
      </div>
    </div>
  );
}
