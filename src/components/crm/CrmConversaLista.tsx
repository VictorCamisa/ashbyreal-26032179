import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, Store, User, UserPlus } from 'lucide-react';
import type { CrmCard, CrmEtapa } from '@/hooks/useCrmQuadro';

const TIPO_ICONE = { lojista: Store, cliente_final: User, desconhecido: UserPlus } as const;

const ETAPA_CURTA: Record<CrmEtapa, string> = {
  lead: 'Lead', contato_feito: 'Contatado', em_atendimento: 'Atendimento',
  b2c: 'B2C', b2b: 'B2B', pedido_aberto: 'Pedido', follow_up: 'Follow up',
};

const ETAPA_COR: Record<CrmEtapa, string> = {
  lead: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  contato_feito: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  em_atendimento: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  b2c: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  b2b: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  pedido_aberto: 'bg-primary/15 text-primary',
  follow_up: 'bg-muted text-muted-foreground',
};

function horario(iso: string | null) {
  if (!iso) return '';
  const data = new Date(iso);
  const hoje = new Date();
  const mesmoDia = data.toDateString() === hoje.toDateString();
  if (mesmoDia) return data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
  if (data.toDateString() === ontem.toDateString()) return 'ontem';
  return data.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

const iniciais = (nome: string) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

export interface FiltroConversa {
  id: string;
  label: string;
  conta: number;
}

interface Props {
  cards: CrmCard[];
  selecionado: string | null;
  onSelecionar: (card: CrmCard) => void;
  busca: string;
  onBuscar: (v: string) => void;
  filtros: FiltroConversa[];
  filtroAtivo: string;
  onFiltrar: (id: string) => void;
}

export function CrmConversaLista({
  cards, selecionado, onSelecionar, busca, onBuscar, filtros, filtroAtivo, onFiltrar,
}: Props) {
  return (
    <div className="flex h-full min-h-0 flex-col border-r border-border/60">
      <div className="space-y-2.5 border-b border-border/60 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={busca}
            onChange={(e) => onBuscar(e.target.value)}
            placeholder="Buscar conversa ou contato..."
            className="h-9 rounded-xl border-0 bg-secondary/70 pl-9 text-sm focus-visible:ring-1"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {filtros.map((f) => (
            <button
              key={f.id}
              onClick={() => onFiltrar(f.id)}
              className={cn(
                'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
                filtroAtivo === f.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary/70 text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
              {f.conta > 0 && <span className="ml-1 opacity-70">{f.conta}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* O viewport do ScrollArea cresce com o conteúdo (display:table) e
          estoura a coluna — forçar block faz o truncate voltar a valer. */}
      <ScrollArea className="min-h-0 flex-1 [&>[data-radix-scroll-area-viewport]>div]:!block">
        {cards.length === 0 ? (
          <p className="px-4 py-10 text-center text-xs text-muted-foreground">
            Nenhuma conversa neste filtro
          </p>
        ) : (
          cards.map((card) => {
            const Icone = TIPO_ICONE[card.tipo_contato];
            const ativo = selecionado === card.id;
            return (
              <button
                key={card.id}
                onClick={() => onSelecionar(card)}
                className={cn(
                  'flex w-full items-start gap-3 border-b border-border/40 px-3 py-2.5 text-left transition-colors',
                  ativo ? 'bg-primary/10' : 'hover:bg-muted/50',
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-secondary text-xs font-semibold">
                      {iniciais(card.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 grid h-4 w-4 place-items-center rounded-full bg-card">
                    <Icone className="h-2.5 w-2.5 text-muted-foreground" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className={cn('min-w-0 flex-1 truncate text-sm', ativo ? 'font-semibold' : 'font-medium')}>
                      {card.nome}
                    </p>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {horario(card.ultima_mensagem_em)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {card.ultima_mensagem ?? (card.telefone ?? 'sem conversa')}
                    </p>
                    {card.aguardando_resposta && (
                      <span className="h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="aguardando resposta" />
                    )}
                  </div>
                  <div className="mt-1.5 flex items-center gap-1">
                    <Badge variant="secondary" className={cn('h-4 px-1.5 text-[9px] font-medium', ETAPA_COR[card.etapa])}>
                      {ETAPA_CURTA[card.etapa]}
                    </Badge>
                    {(card.pedidos_historico ?? 0) > 0 && (
                      <span className="text-[9px] text-muted-foreground">
                        {card.pedidos_historico} pedidos
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </ScrollArea>
    </div>
  );
}
