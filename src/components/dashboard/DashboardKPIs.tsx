import { DollarSign, Users, Target, Package, MessageSquare, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { DashboardData } from '@/hooks/useDashboard';

interface DashboardKPIsProps {
  data?: DashboardData;
  isLoading: boolean;
}

export function DashboardKPIs({ data, isLoading }: DashboardKPIsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="glass-card p-5 animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-3" />
            <div className="h-7 w-24 bg-muted rounded mb-2" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
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
      change: data.vendas.crescimento,
      subtitle: `${data.vendas.quantidade} pedidos`,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Clientes',
      value: data.clientes.total.toString(),
      icon: Users,
      change: data.clientes.crescimento,
      subtitle: `${data.clientes.novos} novos`,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Leads Ativos',
      value: data.leads.total.toString(),
      icon: Target,
      change: null,
      subtitle: `${data.leads.conversao.toFixed(1)}% conversão`,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10',
    },
    {
      title: 'Valor Estoque',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        notation: 'compact',
      }).format(data.estoque.valor),
      icon: Package,
      change: null,
      subtitle: `${data.estoque.total} unidades`,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Campanhas',
      value: data.campanhas.total.toString(),
      icon: MessageSquare,
      change: null,
      subtitle: `${data.campanhas.taxaResposta.toFixed(1)}% resposta`,
      color: 'text-cyan-500',
      bgColor: 'bg-cyan-500/10',
    },
    {
      title: 'Alertas',
      value: data.estoque.alertas.toString(),
      icon: AlertTriangle,
      change: null,
      subtitle: 'Estoque baixo',
      color: data.estoque.alertas > 0 ? 'text-rose-500' : 'text-emerald-500',
      bgColor: data.estoque.alertas > 0 ? 'bg-rose-500/10' : 'bg-emerald-500/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {kpis.map((kpi) => (
        <div
          key={kpi.title}
          className="glass-card p-5 hover-lift"
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-muted-foreground">{kpi.title}</span>
            <div className={`h-8 w-8 rounded-xl ${kpi.bgColor} flex items-center justify-center`}>
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
            </div>
          </div>
          
          <p className="text-xl font-semibold tracking-tight mb-1">{kpi.value}</p>
          
          <div className="flex items-center gap-1.5">
            {kpi.change !== null && (
              <>
                {kpi.change >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-emerald-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-rose-500" />
                )}
                <span className={`text-xs font-medium ${kpi.change >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {kpi.change >= 0 ? '+' : ''}{kpi.change.toFixed(1)}%
                </span>
              </>
            )}
            <span className="text-xs text-muted-foreground">{kpi.subtitle}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
