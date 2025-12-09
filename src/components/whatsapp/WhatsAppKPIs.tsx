import { MessageSquare, CheckCheck, Send, Users, Eye, Clock } from 'lucide-react';
import { WhatsAppStats } from '@/hooks/useWhatsApp';

interface WhatsAppKPIsProps {
  stats?: WhatsAppStats;
  isLoading?: boolean;
}

export function WhatsAppKPIs({ stats, isLoading }: WhatsAppKPIsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-20 bg-muted rounded mb-2" />
            <div className="h-8 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      label: 'Mensagens',
      value: stats.totalMensagens,
      icon: MessageSquare,
      color: 'text-primary',
    },
    {
      label: 'Entrega',
      value: `${stats.taxaEntrega.toFixed(0)}%`,
      icon: CheckCheck,
      color: 'text-primary',
    },
    {
      label: 'Resposta',
      value: `${stats.taxaResposta.toFixed(0)}%`,
      icon: Send,
      color: 'text-primary',
    },
    {
      label: 'Ativas',
      value: stats.conversasAtivas,
      icon: Users,
      color: 'text-primary',
    },
    {
      label: 'Não lidas',
      value: stats.conversasNaoLidas,
      icon: Eye,
      color: stats.conversasNaoLidas > 0 ? 'text-destructive' : 'text-primary',
    },
    {
      label: 'Recebidas',
      value: stats.mensagensRecebidas,
      icon: Clock,
      color: 'text-primary',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
      {kpis.map((kpi) => (
        <div key={kpi.label} className="group">
          <div className="flex items-center gap-2 mb-1">
            <kpi.icon className={`h-3.5 w-3.5 ${kpi.color} opacity-70`} />
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {kpi.label}
            </span>
          </div>
          <p className="text-2xl font-semibold tracking-tight">{kpi.value}</p>
        </div>
      ))}
    </div>
  );
}
