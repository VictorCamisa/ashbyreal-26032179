import { useMemo, useState } from 'react';
import { DndContext, DragEndEvent, useDroppable } from '@dnd-kit/core';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { PageLayout } from '@/components/layout/PageLayout';
import { CrmCardItem } from '@/components/crm/CrmCardItem';
import { NovoContatoDialog } from '@/components/crm/NovoContatoDialog';
import {
  ETAPAS_POR_PIPELINE, useCrmQuadro,
  type CrmCard, type CrmEtapa, type CrmPipeline,
} from '@/hooks/useCrmQuadro';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { Clock, MessageCircle, Package, Search, Store, Target, Users } from 'lucide-react';

type Visao = CrmPipeline | 'todos';

const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const ROTULO_ETAPA: Record<CrmEtapa, string> = {
  lead: 'Lead', contato_feito: 'Contato feito', em_atendimento: 'Em atendimento',
  b2c: 'B2C', b2b: 'B2B', pedido_aberto: 'Pedido aberto', follow_up: 'Follow up',
};

function Coluna({
  etapa, titulo, descricao, cards, children,
}: {
  etapa: CrmEtapa; titulo: string; descricao: string; cards: CrmCard[]; children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: etapa });
  const valor = cards.reduce((acc, c) => acc + (c.valor_estimado ?? 0), 0);

  return (
    <div className="flex w-[268px] shrink-0 flex-col">
      <div className="px-1 pb-2">
        <div className="flex items-baseline gap-2">
          <h3 className="text-sm font-semibold">{titulo}</h3>
          <span className="text-xs text-muted-foreground tabular-nums">{cards.length}</span>
          {valor > 0 && (
            <span className="ml-auto text-xs font-medium text-primary tabular-nums">{moeda(valor)}</span>
          )}
        </div>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{descricao}</p>
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-[320px] flex-1 flex-col gap-2 rounded-xl border border-dashed p-2 transition-colors',
          isOver ? 'border-primary bg-primary/5' : 'border-border/60 bg-muted/20',
        )}
      >
        {children}
        {cards.length === 0 && (
          <p className="px-2 py-8 text-center text-[11px] text-muted-foreground/70">
            Nenhum card aqui
          </p>
        )}
      </div>
    </div>
  );
}

export default function CRM() {
  const [visao, setVisao] = useState<Visao>('comercial');
  const [busca, setBusca] = useState('');
  const { cards, isLoading, moverCard } = useCrmQuadro();
  const navigate = useNavigate();

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((c) =>
      c.nome?.toLowerCase().includes(q) ||
      c.telefone?.includes(q) ||
      c.ultima_mensagem?.toLowerCase().includes(q));
  }, [cards, busca]);

  const stats = useMemo(() => ({
    prospeccao: cards.filter((c) => c.pipeline === 'comercial').length,
    aguardando: cards.filter((c) => c.aguardando_resposta).length,
    pedidosAbertos: cards.filter((c) => c.etapa === 'pedido_aberto').length,
    valorAberto: cards
      .filter((c) => c.etapa === 'pedido_aberto')
      .reduce((acc, c) => acc + (c.valor_estimado ?? 0), 0),
  }), [cards]);

  const aoSoltar = (evento: DragEndEvent) => {
    const destino = evento.over?.id as CrmEtapa | undefined;
    if (!destino) return;
    const card = cards.find((c) => c.id === evento.active.id);
    if (!card || card.etapa === destino) return;

    // A coluna já diz a qual quadro ela pertence
    const pipeline: CrmPipeline =
      ETAPAS_POR_PIPELINE.comercial.some((e) => e.id === destino) ? 'comercial' : 'operacao';
    moverCard({ id: card.id, pipeline, etapa: destino });
  };

  const abas: { id: Visao; label: string; icone: typeof Target }[] = [
    { id: 'comercial', label: 'Comercial', icone: Target },
    { id: 'operacao', label: 'Operação', icone: Store },
    { id: 'todos', label: 'Todos', icone: Users },
  ];

  return (
    <PageLayout
      title="CRM"
      subtitle="Prospecção e operação, alimentados pelo WhatsApp e pelos pedidos"
      actions={<NovoContatoDialog />}
    >
      <div className="space-y-5">
        <KPIGrid>
          <KPICard label="Em prospecção" value={stats.prospeccao} icon={Target} />
          <KPICard label="Aguardando resposta" value={stats.aguardando} icon={MessageCircle} variant="warning" />
          <KPICard label="Pedidos abertos" value={stats.pedidosAbertos} icon={Package} variant="blue" />
          <KPICard label="Valor em aberto" value={moeda(stats.valorAberto)} icon={Clock} variant="success" />
        </KPIGrid>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex gap-1 rounded-xl bg-secondary/60 p-1">
            {abas.map(({ id, label, icone: Icone }) => (
              <button
                key={id}
                onClick={() => setVisao(id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  visao === id ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icone className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone ou mensagem..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-10 rounded-xl pl-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex gap-3 overflow-hidden">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 w-[268px] shrink-0 animate-pulse rounded-xl bg-muted/50" />
            ))}
          </div>
        ) : visao === 'todos' ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-[760px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Contato</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Quadro</TableHead>
                      <TableHead>Etapa</TableHead>
                      <TableHead className="text-right">Pedidos</TableHead>
                      <TableHead className="text-right">Faturamento</TableHead>
                      <TableHead>Última mensagem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtrados.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer hover:bg-muted/30"
                        onClick={() => {
                          if (c.lojista_id) navigate(`/lojistas/${c.lojista_id}`);
                          else if (c.cliente_id) navigate(`/clientes/${c.cliente_id}`);
                        }}
                      >
                        <TableCell>
                          <p className="text-sm font-medium">{c.nome}</p>
                          {c.telefone && <p className="text-xs text-muted-foreground">{c.telefone}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px]">
                            {c.tipo_contato === 'lojista' ? 'Lojista'
                              : c.tipo_contato === 'cliente_final' ? 'Cliente' : 'Novo'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.pipeline === 'comercial' ? 'Comercial' : 'Operação'}
                        </TableCell>
                        <TableCell className="text-sm">{ROTULO_ETAPA[c.etapa]}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">{c.pedidos_historico ?? 0}</TableCell>
                        <TableCell className="text-right text-sm tabular-nums">
                          {moeda(c.faturamento_historico ?? 0)}
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          <p className="truncate text-xs text-muted-foreground">
                            {c.ultima_mensagem ?? '—'}
                          </p>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtrados.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                          Nenhum card encontrado
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <DndContext onDragEnd={aoSoltar}>
            <ScrollArea className="w-full">
              <div className="flex gap-3 pb-4">
                {ETAPAS_POR_PIPELINE[visao].map(({ id, titulo, descricao }) => {
                  const daColuna = filtrados.filter((c) => c.pipeline === visao && c.etapa === id);
                  return (
                    <Coluna key={id} etapa={id} titulo={titulo} descricao={descricao} cards={daColuna}>
                      {daColuna.map((card) => <CrmCardItem key={card.id} card={card} />)}
                    </Coluna>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DndContext>
        )}
      </div>
    </PageLayout>
  );
}
