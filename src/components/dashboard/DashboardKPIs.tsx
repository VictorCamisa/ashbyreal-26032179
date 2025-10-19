import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Users, Target, Package, MessageSquare, DollarSign } from 'lucide-react';
import { DashboardData } from '@/hooks/useDashboard';
import { Skeleton } from '@/components/ui/skeleton';

interface DashboardKPIsProps {
  data?: DashboardData;
  isLoading: boolean;
}

export function DashboardKPIs({ data, isLoading }: DashboardKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-3 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      title: 'Vendas do Mês',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(data.vendas.total),
      icon: DollarSign,
      change: `${data.vendas.crescimento >= 0 ? '+' : ''}${data.vendas.crescimento.toFixed(1)}%`,
      changeType: data.vendas.crescimento >= 0 ? 'positive' : 'negative',
      subtitle: `${data.vendas.quantidade} pedidos`,
    },
    {
      title: 'Total de Clientes',
      value: data.clientes.total.toString(),
      icon: Users,
      change: `${data.clientes.crescimento >= 0 ? '+' : ''}${data.clientes.crescimento.toFixed(1)}%`,
      changeType: data.clientes.crescimento >= 0 ? 'positive' : 'negative',
      subtitle: `${data.clientes.novos} novos este mês`,
    },
    {
      title: 'Leads Ativos',
      value: data.leads.total.toString(),
      icon: Target,
      change: `${data.leads.conversao.toFixed(1)}% conversão`,
      changeType: 'neutral',
      subtitle: 'Taxa de conversão',
    },
    {
      title: 'Valor em Estoque',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(data.estoque.valor),
      icon: Package,
      change: data.estoque.alertas > 0 ? `${data.estoque.alertas} alertas` : 'Tudo OK',
      changeType: data.estoque.alertas > 0 ? 'negative' : 'positive',
      subtitle: `${data.estoque.total} unidades`,
    },
    {
      title: 'Campanhas Ativas',
      value: data.campanhas.total.toString(),
      icon: MessageSquare,
      change: `${data.campanhas.taxaResposta.toFixed(1)}% resposta`,
      changeType: 'neutral',
      subtitle: 'Taxa de resposta',
    },
    {
      title: 'Alertas de Estoque',
      value: data.estoque.alertas.toString(),
      icon: TrendingDown,
      change: data.estoque.alertas > 0 ? 'Atenção necessária' : 'Tudo OK',
      changeType: data.estoque.alertas > 0 ? 'negative' : 'positive',
      subtitle: 'Produtos abaixo do mínimo',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <Card key={kpi.title} className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpi.value}</div>
            <div className="flex items-center gap-1 mt-1">
              {kpi.changeType === 'positive' && (
                <TrendingUp className="h-3 w-3 text-green-500" />
              )}
              {kpi.changeType === 'negative' && (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              <p
                className={`text-xs ${
                  kpi.changeType === 'positive'
                    ? 'text-green-500'
                    : kpi.changeType === 'negative'
                    ? 'text-red-500'
                    : 'text-muted-foreground'
                }`}
              >
                {kpi.change}
              </p>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
