import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trophy, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Pedido {
  id: string;
  clienteId: string;
  valorTotal: number;
  status: string;
}

interface RankingClientesProps {
  pedidos: Pedido[];
  clientesMap: Record<string, string>;
}

export function RankingClientes({ pedidos, clientesMap }: RankingClientesProps) {
  const ranking = useMemo(() => {
    const clienteStats: Record<string, { total: number; pedidos: number }> = {};

    pedidos
      .filter((p) => p.status !== 'cancelado')
      .forEach((pedido) => {
        if (!clienteStats[pedido.clienteId]) {
          clienteStats[pedido.clienteId] = { total: 0, pedidos: 0 };
        }
        clienteStats[pedido.clienteId].total += pedido.valorTotal;
        clienteStats[pedido.clienteId].pedidos += 1;
      });

    return Object.entries(clienteStats)
      .map(([clienteId, stats]) => ({
        clienteId,
        nome: clientesMap[clienteId] || 'Cliente',
        ...stats,
        ticketMedio: stats.total / stats.pedidos,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [pedidos, clientesMap]);

  const getMedalColor = (index: number) => {
    if (index === 0) return 'bg-amber-500 text-white';
    if (index === 1) return 'bg-slate-400 text-white';
    if (index === 2) return 'bg-orange-600 text-white';
    return 'bg-muted text-muted-foreground';
  };

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <Trophy className="h-4 w-4 text-amber-500" />
          Top Clientes
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {ranking.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            Sem dados de clientes
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="divide-y">
              {ranking.map((cliente, index) => (
                <div
                  key={cliente.clienteId}
                  className="flex items-center gap-3 p-4 hover:bg-muted/30 transition-colors"
                >
                  <div
                    className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0',
                      getMedalColor(index)
                    )}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{cliente.nome}</p>
                      {index < 3 && (
                        <TrendingUp className="h-3 w-3 text-emerald-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{cliente.pedidos} pedidos</span>
                      <span>•</span>
                      <span>Ticket: R$ {cliente.ticketMedio.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-primary">
                      R$ {cliente.total.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
