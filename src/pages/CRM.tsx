import { useEffect, useMemo, useState } from 'react';
import { DndContext, DragEndEvent, useDroppable } from '@dnd-kit/core';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CrmCardItem } from '@/components/crm/CrmCardItem';
import { CrmConversaLista } from '@/components/crm/CrmConversaLista';
import { CrmContextoPanel } from '@/components/crm/CrmContextoPanel';
import { NovoContatoDialog } from '@/components/crm/NovoContatoDialog';
import { ChatPanel } from '@/components/whatsapp/ChatPanel';
import {
  ETAPAS_POR_PIPELINE, useCrmQuadro,
  type CrmCard, type CrmEtapa, type CrmPipeline,
} from '@/hooks/useCrmQuadro';
import { useWhatsAppInstances } from '@/hooks/useWhatsAppInstances';
import { useWhatsAppMessages } from '@/hooks/useWhatsAppMessages';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Inbox, Info, MessageSquare, Search, Store, Table2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

type Visao = 'conversas' | 'comercial' | 'operacao' | 'todos';

const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const ROTULO_ETAPA: Record<CrmEtapa, string> = {
  lead: 'Lead', contato_feito: 'Contato feito', em_atendimento: 'Em atendimento',
  b2c: 'B2C', b2b: 'B2B', pedido_aberto: 'Pedido aberto', follow_up: 'Follow up',
};

/** Compara telefones pelos 8 dígitos finais: a base mistura DDI, DDD e o 9. */
const fim8 = (v?: string | null) => (v ?? '').replace(/\D/g, '').slice(-8);

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
          <span className="text-xs tabular-nums text-muted-foreground">{cards.length}</span>
          {valor > 0 && (
            <span className="ml-auto text-xs font-medium tabular-nums text-primary">{moeda(valor)}</span>
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
          <p className="px-2 py-8 text-center text-[11px] text-muted-foreground/70">Nenhum card aqui</p>
        )}
      </div>
    </div>
  );
}

export default function CRM() {
  const [visao, setVisao] = useState<Visao>('conversas');
  const [busca, setBusca] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [selecionadoId, setSelecionadoId] = useState<string | null>(null);
  // Em tela estreita não cabem os três painéis: alterna lista ↔ conversa
  const [painelMovel, setPainelMovel] = useState<'lista' | 'conversa'>('lista');

  const { cards, isLoading, moverCard } = useCrmQuadro();
  const { instances } = useWhatsAppInstances();
  const navigate = useNavigate();

  // O chat usa a instância conectada; sem nenhuma, cai na primeira cadastrada
  const instancia = useMemo(() => {
    const conectada = instances?.find((i) => i.status === 'connected');
    return conectada ?? instances?.[0] ?? null;
  }, [instances]);
  const instanciaId = instancia?.id ?? null;

  const { conversations, getMessages, sendMessage } = useWhatsAppMessages(instanciaId);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return cards.filter((c) => {
      const casaBusca = !q ||
        c.nome?.toLowerCase().includes(q) ||
        c.telefone?.includes(q) ||
        c.ultima_mensagem?.toLowerCase().includes(q);
      if (!casaBusca) return false;
      if (filtro === 'aguardando') return c.aguardando_resposta;
      if (filtro === 'prospeccao') return c.pipeline === 'comercial';
      if (filtro === 'pedido') return c.etapa === 'pedido_aberto';
      if (filtro === 'lojistas') return c.tipo_contato === 'lojista';
      return true;
    });
  }, [cards, busca, filtro]);

  /** A caixa de entrada é sobre o que é recente: conversa em cima, resto depois. */
  const ordenados = useMemo(() => {
    return [...filtrados].sort((a, b) => {
      if (a.aguardando_resposta !== b.aguardando_resposta) return a.aguardando_resposta ? -1 : 1;
      const ta = a.ultima_mensagem_em ? new Date(a.ultima_mensagem_em).getTime() : 0;
      const tb = b.ultima_mensagem_em ? new Date(b.ultima_mensagem_em).getTime() : 0;
      if (ta !== tb) return tb - ta;
      return (b.faturamento_historico ?? 0) - (a.faturamento_historico ?? 0);
    });
  }, [filtrados]);

  useEffect(() => {
    if (visao !== 'conversas') return;
    if (!selecionadoId && ordenados.length > 0) setSelecionadoId(ordenados[0].id);
  }, [visao, ordenados, selecionadoId]);

  const selecionado = useMemo(
    () => cards.find((c) => c.id === selecionadoId) ?? null,
    [cards, selecionadoId],
  );

  // Liga o card à conversa do WhatsApp pelo telefone
  const conversaDoCard = useMemo(() => {
    if (!selecionado) return null;
    const alvo = fim8(selecionado.telefone);
    if (!alvo) return null;
    return conversations.find((c) =>
      fim8(c.phone_number) === alvo || fim8(c.remote_jid) === alvo) ?? null;
  }, [selecionado, conversations]);

  const { data: mensagens = [], isLoading: carregandoMensagens } = getMessages(conversaDoCard);

  const filtrosLista = useMemo(() => [
    { id: 'todas', label: 'Todas', conta: cards.length },
    { id: 'aguardando', label: 'Aguardando', conta: cards.filter((c) => c.aguardando_resposta).length },
    { id: 'prospeccao', label: 'Prospecção', conta: cards.filter((c) => c.pipeline === 'comercial').length },
    { id: 'pedido', label: 'Pedido aberto', conta: cards.filter((c) => c.etapa === 'pedido_aberto').length },
    { id: 'lojistas', label: 'Lojistas', conta: cards.filter((c) => c.tipo_contato === 'lojista').length },
  ], [cards]);

  const aoSoltar = (evento: DragEndEvent) => {
    const destino = evento.over?.id as CrmEtapa | undefined;
    if (!destino) return;
    const card = cards.find((c) => c.id === evento.active.id);
    if (!card || card.etapa === destino) return;
    const pipeline: CrmPipeline =
      ETAPAS_POR_PIPELINE.comercial.some((e) => e.id === destino) ? 'comercial' : 'operacao';
    moverCard({ id: card.id, pipeline, etapa: destino });
  };

  const abas: { id: Visao; label: string; icone: typeof Inbox }[] = [
    { id: 'conversas', label: 'Conversas', icone: Inbox },
    { id: 'comercial', label: 'Comercial', icone: Target },
    { id: 'operacao', label: 'Operação', icone: Store },
    { id: 'todos', label: 'Lista', icone: Table2 },
  ];

  return (
    <div className="animate-fade-in flex h-[calc(100vh-13rem)] min-h-[560px] flex-col gap-4 lg:h-[calc(100vh-11rem)]">
      {/* Cabeçalho enxuto: o conteúdo é o que importa, não a moldura */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1 rounded-xl bg-secondary/60 p-1">
          {abas.map(({ id, label, icone: Icone }) => (
            <button
              key={id}
              onClick={() => setVisao(id)}
              className={cn(
                'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
                visao === id ? 'bg-card text-foreground shadow-soft' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icone className="h-4 w-4" />
              <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {visao !== 'conversas' && (
            <div className="relative w-full sm:w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar..."
                className="h-9 rounded-xl pl-9"
              />
            </div>
          )}
          <NovoContatoDialog />
        </div>
      </div>

      {isLoading ? (
        <div className="flex-1 animate-pulse rounded-2xl bg-muted/40" />
      ) : visao === 'conversas' ? (
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-2xl border border-border/60 bg-card lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_300px]">
          <div className={cn('min-h-0', painelMovel === 'conversa' && 'hidden lg:block')}>
            <CrmConversaLista
              cards={ordenados}
              selecionado={selecionadoId}
              onSelecionar={(c) => { setSelecionadoId(c.id); setPainelMovel('conversa'); }}
              busca={busca}
              onBuscar={setBusca}
              filtros={filtrosLista}
              filtroAtivo={filtro}
              onFiltrar={setFiltro}
            />
          </div>

          <div className={cn('min-h-0 flex-col', painelMovel === 'lista' ? 'hidden lg:flex' : 'flex')}>
            {/* Barra só de tela estreita: voltar para a lista e abrir o contexto */}
            {selecionado && (
              <div className="flex items-center gap-2 border-b border-border/60 px-2 py-1.5 lg:hidden">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPainelMovel('lista')}>
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Voltar para as conversas</span>
                </Button>
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{selecionado.nome}</p>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Info className="h-4 w-4" />
                      <span className="sr-only">Detalhes do contato</span>
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[320px] p-0 pt-6">
                    <SheetTitle className="sr-only">Detalhes do contato</SheetTitle>
                    <CrmContextoPanel card={selecionado} onMover={moverCard} />
                  </SheetContent>
                </Sheet>
              </div>
            )}
            {selecionado ? (
              conversaDoCard ? (
                <ChatPanel
                  conversation={conversaDoCard}
                  messages={mensagens}
                  isLoading={carregandoMensagens}
                  onSendMessage={async (texto, tipo, media) => {
                    if (!instancia) return;
                    // A edge function identifica a instância pelo nome, não pelo id
                    await sendMessage.mutateAsync({
                      instanceName: instancia.instance_name,
                      remoteJid: conversaDoCard.remote_jid,
                      message: texto,
                      messageType: tipo,
                      mediaUrl: media,
                    });
                  }}
                  isSending={sendMessage.isPending}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-muted">
                    <MessageSquare className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium">Sem conversa no WhatsApp</p>
                  <p className="max-w-xs text-xs text-muted-foreground">
                    {selecionado.nome} está no CRM por cadastro ou pedido. Quando houver
                    troca de mensagens neste número, o histórico aparece aqui.
                  </p>
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-muted-foreground">Escolha uma conversa</p>
              </div>
            )}
          </div>

          <div className="hidden min-h-0 xl:block">
            {selecionado && <CrmContextoPanel card={selecionado} onMover={moverCard} />}
          </div>
        </div>
      ) : visao === 'todos' ? (
        <Card className="min-h-0 flex-1 overflow-hidden">
          <CardContent className="h-full p-0">
            <ScrollArea className="h-full">
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
                  {ordenados.map((c) => (
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
                        <p className="truncate text-xs text-muted-foreground">{c.ultima_mensagem ?? '—'}</p>
                      </TableCell>
                    </TableRow>
                  ))}
                  {ordenados.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="py-12 text-center text-sm text-muted-foreground">
                        Nenhum card encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <DndContext onDragEnd={aoSoltar}>
          <ScrollArea className="min-h-0 flex-1">
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
  );
}
