import { useState, useMemo, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import {
  CalendarDays,
  Package,
  DollarSign,
  Lock,
  Unlock,
  CheckCircle2,
  Clock,
  FileDown,
  Truck,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { startOfWeek, endOfWeek, format, isWithinInterval, isPast, eachDayOfInterval, isSameDay } from 'date-fns';
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

export function SemanaPanel({ pedidos, clientesMap, onViewDetails, onRefetch }: SemanaPanelProps) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const pedidosDaSemana = useMemo(() => {
    return pedidos.filter((p) => {
      const dataPedido = new Date(p.dataPedido);
      return isWithinInterval(dataPedido, { start: weekStart, end: weekEnd });
    });
  }, [pedidos, weekStart, weekEnd]);

  const totalValor = pedidosDaSemana.reduce((acc, p) => acc + p.valorTotal, 0);
  const totalPedidos = pedidosDaSemana.length;
  const pedidosPendentes = pedidosDaSemana.filter((p) => p.status === 'pendente');
  const pedidosConfirmados = pedidosDaSemana.filter((p) => p.status === 'pago' || p.status === 'entregue');
  const pedidosCancelados = pedidosDaSemana.filter((p) => p.status === 'cancelado');

  // Deadline: Wednesday 23:59
  const wednesday = new Date(weekStart);
  wednesday.setDate(wednesday.getDate() + 2);
  wednesday.setHours(23, 59, 59);
  const deadlinePassed = isPast(wednesday);

  // Friday delivery
  const friday = new Date(weekStart);
  friday.setDate(friday.getDate() + 4);

  const weekLabel = `${format(weekStart, "dd/MM", { locale: ptBR })} — ${format(weekEnd, "dd/MM", { locale: ptBR })}`;

  // Group pedidos by day
  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });
  const pedidosByDay = useMemo(() => {
    return daysOfWeek.map(day => ({
      day,
      label: format(day, 'EEE', { locale: ptBR }),
      fullLabel: format(day, "EEEE, dd/MM", { locale: ptBR }),
      pedidos: pedidosDaSemana.filter(p => isSameDay(new Date(p.dataPedido), day)),
      isToday: isSameDay(day, now),
      isDeadline: isSameDay(day, wednesday),
      isDelivery: isSameDay(day, friday),
    }));
  }, [pedidosDaSemana, daysOfWeek]);

  const statusColors: Record<string, string> = {
    pendente: 'bg-warning/10 text-warning border-warning/20',
    pago: 'bg-success/10 text-success border-success/20',
    entregue: 'bg-primary/10 text-primary border-primary/20',
    cancelado: 'bg-destructive/10 text-destructive border-destructive/20',
  };

  const generatePdf = useCallback(async () => {
    setIsGeneratingPdf(true);
    try {
      // Build consolidated data
      const consolidatedOrders = pedidosDaSemana
        .filter(p => p.status !== 'cancelado')
        .map(p => ({
          numero: (p as any).numeroPedido || p.id.slice(0, 8),
          cliente: clientesMap[p.clienteId] || 'N/I',
          valor: p.valorTotal,
          status: p.status,
          data: format(new Date(p.dataPedido), 'dd/MM/yyyy HH:mm'),
          obs: p.observacoes || '',
        }));

      const totalConsolidado = consolidatedOrders.reduce((acc, o) => acc + o.valor, 0);

      // Generate a printable HTML and trigger browser print/save as PDF
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Permita pop-ups para gerar o PDF.');
        return;
      }

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>Pedido Consolidado Ashby — Semana ${weekLabel}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; color: #1a1a2e; padding: 40px; font-size: 13px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; border-bottom: 3px solid #2b4acb; padding-bottom: 16px; }
    .header h1 { font-size: 22px; font-weight: 700; color: #2b4acb; }
    .header .meta { text-align: right; font-size: 12px; color: #666; }
    .header .meta strong { color: #1a1a2e; }
    .summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 28px; }
    .summary-card { background: #f0f4ff; border-radius: 8px; padding: 16px; text-align: center; }
    .summary-card .value { font-size: 24px; font-weight: 700; color: #2b4acb; }
    .summary-card .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    th { background: #2b4acb; color: white; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    td { padding: 10px 12px; border-bottom: 1px solid #e8e8f0; }
    tr:nth-child(even) { background: #fafbff; }
    .status { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 11px; font-weight: 600; }
    .status-pendente { background: #fff3cd; color: #856404; }
    .status-pago { background: #d4edda; color: #155724; }
    .status-entregue { background: #cce5ff; color: #004085; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 11px; color: #999; display: flex; justify-content: space-between; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Pedido Consolidado — Ashby</h1>
      <p style="color:#666; margin-top:4px;">Semana ${weekLabel}</p>
    </div>
    <div class="meta">
      <p>Gerado em: <strong>${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</strong></p>
      <p>Entrega prevista: <strong>${format(friday, "EEEE, dd/MM", { locale: ptBR })}</strong></p>
    </div>
  </div>

  <div class="summary">
    <div class="summary-card">
      <div class="value">${consolidatedOrders.length}</div>
      <div class="label">Pedidos</div>
    </div>
    <div class="summary-card">
      <div class="value">R$ ${totalConsolidado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
      <div class="label">Valor Total</div>
    </div>
    <div class="summary-card">
      <div class="value">${pedidosConfirmados.length}</div>
      <div class="label">Confirmados</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Cliente</th>
        <th>Data</th>
        <th>Valor</th>
        <th>Status</th>
        <th>Observações</th>
      </tr>
    </thead>
    <tbody>
      ${consolidatedOrders.map((o, i) => `
        <tr>
          <td>${o.numero}</td>
          <td style="font-weight:600">${o.cliente}</td>
          <td>${o.data}</td>
          <td style="font-weight:600">R$ ${o.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
          <td><span class="status status-${o.status}">${o.status}</span></td>
          <td style="color:#666; max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${o.obs || '—'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div style="text-align:right; font-size:15px; font-weight:700; color:#2b4acb; margin-bottom:24px;">
    Total: R$ ${totalConsolidado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
  </div>

  <button class="no-print" onclick="window.print()" style="background:#2b4acb;color:white;border:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">
    Imprimir / Salvar como PDF
  </button>

  <div class="footer">
    <span>Zero Paper ERP — Pedido Consolidado Ashby</span>
    <span>Documento gerado automaticamente</span>
  </div>
</body>
</html>`;

      printWindow.document.write(html);
      printWindow.document.close();
    } finally {
      setIsGeneratingPdf(false);
    }
  }, [pedidosDaSemana, clientesMap, weekLabel, now, friday, pedidosConfirmados]);

  return (
    <div className="space-y-6">
      {/* Week Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
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
                : `Prazo: Quarta-feira, ${format(wednesday, "dd/MM", { locale: ptBR })} · Entrega: Sexta, ${format(friday, "dd/MM", { locale: ptBR })}`}
            </p>
          </div>
        </div>
        <Button
          onClick={generatePdf}
          disabled={isGeneratingPdf || pedidosDaSemana.length === 0}
          className="gap-2"
        >
          <FileDown className="h-4 w-4" />
          Gerar PDF Ashby
        </Button>
      </div>

      {/* KPIs */}
      <KPIGrid>
        <KPICard
          label="Pedidos"
          value={totalPedidos}
          icon={Package}
          subtitle={`${pedidosPendentes.length} pendentes`}
        />
        <KPICard
          label="Valor Total"
          value={`R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          icon={DollarSign}
        />
        <KPICard
          label="Confirmados"
          value={pedidosConfirmados.length}
          icon={CheckCircle2}
          subtitle={`de ${totalPedidos}`}
        />
        <KPICard
          label="Prazo"
          value={deadlinePassed ? 'Encerrado' : 'Aberto'}
          icon={Clock}
          subtitle={`Quarta ${format(wednesday, "dd/MM")}`}
        />
      </KPIGrid>

      {/* Timeline — day-by-day */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Visão da Semana</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5">
            {pedidosByDay.map(({ day, label, pedidos: dayPedidos, isToday, isDeadline, isDelivery }) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "rounded-xl border p-2.5 min-h-[100px] transition-colors text-center",
                  isToday && "border-primary/40 bg-primary/5",
                  isDeadline && !isToday && "border-warning/40 bg-warning/5",
                  isDelivery && !isToday && "border-success/40 bg-success/5",
                  !isToday && !isDeadline && !isDelivery && "border-border/50"
                )}
              >
                <p className={cn(
                  "text-xs font-semibold capitalize mb-1",
                  isToday ? "text-primary" : "text-muted-foreground"
                )}>
                  {label}
                </p>
                <p className="text-[10px] text-muted-foreground mb-2">
                  {format(day, 'dd/MM')}
                </p>
                {isDeadline && (
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <AlertCircle className="h-3 w-3 text-warning" />
                    <span className="text-[10px] font-medium text-warning">Prazo</span>
                  </div>
                )}
                {isDelivery && (
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Truck className="h-3 w-3 text-success" />
                    <span className="text-[10px] font-medium text-success">Entrega</span>
                  </div>
                )}
                {dayPedidos.length > 0 ? (
                  <div className="space-y-1">
                    <div className="text-lg font-bold text-foreground">{dayPedidos.length}</div>
                    <div className="text-[10px] text-muted-foreground">
                      R$ {dayPedidos.reduce((a, p) => a + p.valorTotal, 0).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground/40 mt-2">—</div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Alerts */}
      {pedidosPendentes.length > 0 && !deadlinePassed && (
        <div className="flex items-center gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5">
          <AlertCircle className="h-5 w-5 text-warning shrink-0" />
          <div>
            <p className="text-sm font-medium">
              {pedidosPendentes.length} pedido{pedidosPendentes.length > 1 ? 's' : ''} pendente{pedidosPendentes.length > 1 ? 's' : ''} de confirmação
            </p>
            <p className="text-xs text-muted-foreground">
              Confirme antes de quarta-feira para incluir na carga da Ashby
            </p>
          </div>
        </div>
      )}

      {/* Orders List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">Pedidos desta Semana</CardTitle>
            <span className="text-xs text-muted-foreground">{totalPedidos} pedidos</span>
          </div>
        </CardHeader>
        <CardContent>
          {pedidosDaSemana.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12">
              <CalendarDays className="h-10 w-10 text-muted-foreground/30" />
              <p className="text-muted-foreground">Nenhum pedido nesta semana ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pedidosDaSemana.map((pedido) => (
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
                    <Badge className={cn("text-xs border", statusColors[pedido.status] || '')}>
                      {pedido.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
