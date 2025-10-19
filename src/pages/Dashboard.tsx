import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, Users, Target, Package, MessageSquare } from 'lucide-react';

export default function Dashboard() {
  const kpis = [
    {
      title: 'Vendas do Mês',
      value: 'R$ 127.500',
      icon: TrendingUp,
      change: '+12.5%',
      changeType: 'positive' as const
    },
    {
      title: 'Clientes Ativos',
      value: '342',
      icon: Users,
      change: '+8.2%',
      changeType: 'positive' as const
    },
    {
      title: 'Leads Ativos',
      value: '89',
      icon: Target,
      change: '+15.3%',
      changeType: 'positive' as const
    },
    {
      title: 'Itens em Estoque',
      value: '1.234',
      icon: Package,
      change: '-3.1%',
      changeType: 'negative' as const
    },
    {
      title: 'Engajamento',
      value: '68%',
      icon: MessageSquare,
      change: '+5.4%',
      changeType: 'positive' as const
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Centro de Inteligência Ashby</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.value}</div>
              <p className={`text-xs ${
                kpi.changeType === 'positive' ? 'text-green-500' : 'text-red-500'
              }`}>
                {kpi.change} vs mês anterior
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gráficos e Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Evolução de Vendas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Gráfico de vendas (em desenvolvimento)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Crescimento de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Gráfico de clientes (em desenvolvimento)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Origem dos Leads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Gráfico de origem (em desenvolvimento)
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Gráfico de produtos (em desenvolvimento)
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Insights Automáticos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              📊 Suas vendas cresceram 12.5% este mês comparado ao anterior
            </p>
            <p className="text-sm text-muted-foreground">
              🎯 89 leads ativos aguardando qualificação
            </p>
            <p className="text-sm text-muted-foreground">
              ⚠️ 3 produtos com estoque baixo requerem atenção
            </p>
            <p className="text-sm text-muted-foreground">
              💬 Taxa de engajamento no WhatsApp está acima da média
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
