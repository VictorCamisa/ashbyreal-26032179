import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Send, CheckCheck, MessageSquare, Users, Eye, Clock } from 'lucide-react';
import { WhatsAppStats } from '@/hooks/useWhatsApp';
import { Skeleton } from '@/components/ui/skeleton';

interface WhatsAppKPIsProps {
  stats?: WhatsAppStats;
  isLoading?: boolean;
}

export function WhatsAppKPIs({ stats, isLoading }: WhatsAppKPIsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20 mb-2" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: 'Total de Mensagens',
      value: stats.totalMensagens.toString(),
      icon: MessageSquare,
      subtitle: `${stats.mensagensEnviadas} enviadas`,
    },
    {
      title: 'Taxa de Entrega',
      value: `${stats.taxaEntrega.toFixed(1)}%`,
      icon: CheckCheck,
      subtitle: 'Mensagens entregues',
    },
    {
      title: 'Taxa de Resposta',
      value: `${stats.taxaResposta.toFixed(1)}%`,
      icon: Send,
      subtitle: 'Clientes responderam',
    },
    {
      title: 'Conversas Ativas',
      value: stats.conversasAtivas.toString(),
      icon: Users,
      subtitle: 'Conversas abertas',
    },
    {
      title: 'Não Lidas',
      value: stats.conversasNaoLidas.toString(),
      icon: Eye,
      subtitle: 'Aguardando resposta',
    },
    {
      title: 'Mensagens Recebidas',
      value: stats.mensagensRecebidas.toString(),
      icon: Clock,
      subtitle: 'Dos clientes',
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
            <p className="text-xs text-muted-foreground mt-1">{kpi.subtitle}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
