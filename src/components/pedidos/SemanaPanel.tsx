import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import {
  CalendarDays,
  Package,
  DollarSign,
  Droplets,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  MessageCircle,
  Phone,
  MapPin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, format, isWithinInterval, isWednesday, isPast, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pedido {
  id: string;
  clienteId: string;
  valorTotal: number;
  status: string;
  dataPedido: string;
  numeroPedido?: number;
  observacoes?: string;
}

interface SemanaPanelProps {
  pedidos: Pedido[];
  clientesMap: Record<string, string>;
  onViewDetails: (pedido: any) => void;
  onRefetch: () => void;
}

const origemIcon: Record<string, any> = {
  whatsapp: MessageCircle,
  telefone: Phone,
  presencial: MapPin,
};

const origemLabel: Record<string, string> = {
  whatsapp: 'WhatsApp',
  telefone: 'Telefone',
  presencial: 'Presencial',
};

export function SemanaPanel({ pedidos, clientesMap, onViewDetails, onRefetch }: SemanaPanelProps) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

  const pedidosDaSemana = useMemo(() => {
    return pedidos.filter((p) => {
      const dataPedido = new Date(p.dataPedido);
      return isWithinInterval(dataPedido, { start: weekStart, end: weekEnd });
    });
  }, [pedidos, weekStart, weekEnd]);

  const totalValor = pedidosDaSemana.reduce((acc, p) => acc + p.valorTotal, 0);
  const totalPedidos = pedidosDaSemana.length;
  const pedidosPendentes = pedidosDaSemana.filter((p) => p.status === 'pendente').length;
  const pedidosPagos = pedidosDaSemana.filter((p) => p.status === 'pago' || p.status === 'entregue').length;

  // Deadline: Wednesday of the current week
  const wednesday = new Date(weekStart);
  wednesday.setDate(wednesday.getDate() + 2);
  wednesday.setHours(23, 59, 59);
  const deadlinePassed = isPast(wednesday);

  const weekLabel = `${format(weekStart, "dd/MM", { locale: ptBR })} — ${format(weekEnd, "dd/MM", { locale: ptBR })}`;

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-xl",
            deadlinePassed ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
          )}>
            {deadlinePassed ? <Lock className="h-5 w-5" /> : <Unlock className="h-5 w-5" />}
          </div>
          <div>
            <h3 className="text-lg font-semibold flex items-center gap-2">
              Semana {weekLabel}
              <Badge variant={deadlinePassed ? "destructive" : "default"} className="text-xs">
                {deadlinePassed ? 'Fechada' : 'Coletando Pedidos'}
              </Badge>
            </h3>
            <p className="text-sm text-muted-foreground">
              {deadlinePassed
                ? 'Prazo encerrado — pedidos enviados para logística Ashby'
                : `Prazo para fechar: Quarta-feira, ${format(wednesday, "dd/MM", { locale: ptBR })}`}
            </p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <KPIGrid>
        <KPICard
          label="Pedidos da Semana"
          value={totalPedidos}
          icon={Package}
          subtitle={`${pedidosPendentes} pendentes`}
        />
        <KPICard
          label="Valor Total"
          value={`R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <KPICard
          label="Confirmados"
          value={pedidosPagos}
          icon={CheckCircle2}
          subtitle={`de ${totalPedidos} pedidos`}
        />
        <KPICard
          label="Prazo"
          value={deadlinePassed ? 'Encerrado' : 'Aberto'}
          icon={Clock}
          subtitle={`Quarta ${format(wednesday, "dd/MM")}`}
        />
      </KPIGrid>

      {/* Orders List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Pedidos desta Semana</CardTitle>
        </CardHeader>
        <CardContent>
          {pedidosDaSemana.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum pedido nesta semana ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pedidosDaSemana.map((pedido) => {
                const statusColors: Record<string, string> = {
                  pendente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
                  pago: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
                  entregue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
                  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
                };

                return (
                  <div
                    key={pedido.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => onViewDetails(pedido)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div>
                        <p className="text-sm font-medium truncate">
                          {clientesMap[pedido.clienteId] || 'Cliente não identificado'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{(pedido as any).numeroPedido || pedido.id.slice(0, 8)} · {format(new Date(pedido.dataPedido), "dd/MM HH:mm")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-primary whitespace-nowrap">
                        R$ {pedido.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </span>
                      <Badge className={cn("text-xs", statusColors[pedido.status] || '')}>
                        {pedido.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
