import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  ArrowUpRight, Loader2, MessageSquarePlus, Package, Phone, StickyNote, Store, Target, User,
} from 'lucide-react';
import { ETAPAS_POR_PIPELINE, type CrmCard, type CrmEtapa, type CrmPipeline } from '@/hooks/useCrmQuadro';
import { useCrmInteracoes } from '@/hooks/useCrmInteracoes';
import { cn } from '@/lib/utils';

const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const ICONE_TIPO = {
  nota: StickyNote, etapa: Target, pedido: Package, conversa: MessageSquarePlus, sistema: Target,
} as const;

const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const iniciais = (nome: string) =>
  nome.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';

interface Props {
  card: CrmCard;
  onMover: (args: { id: string; pipeline: CrmPipeline; etapa: CrmEtapa }) => void;
}

export function CrmContextoPanel({ card, onMover }: Props) {
  const navigate = useNavigate();
  const [nota, setNota] = useState('');
  const { interacoes, adicionarNota, salvandoNota } = useCrmInteracoes(card.id);

  const salvar = () => {
    const texto = nota.trim();
    if (!texto) return;
    adicionarNota({ descricao: texto });
    setNota('');
  };

  const mudarEtapa = (etapa: string) => {
    const pipeline: CrmPipeline =
      ETAPAS_POR_PIPELINE.comercial.some((e) => e.id === etapa) ? 'comercial' : 'operacao';
    onMover({ id: card.id, pipeline, etapa: etapa as CrmEtapa });
  };

  const abrirCadastro = () => {
    if (card.lojista_id) navigate(`/lojistas/${card.lojista_id}`);
    else if (card.cliente_id) navigate(`/clientes/${card.cliente_id}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col border-l border-border/60 bg-muted/10">
      <div className="border-b border-border/60 p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-11 w-11">
            <AvatarFallback className="bg-secondary text-sm font-semibold">
              {iniciais(card.nome)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{card.nome}</p>
            <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
              <Phone className="h-3 w-3" />
              {card.telefone ?? 'sem telefone'}
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="gap-1 text-[10px]">
            {card.tipo_contato === 'lojista' ? <Store className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
            {card.tipo_contato === 'lojista' ? 'Lojista'
              : card.tipo_contato === 'cliente_final' ? 'Cliente' : 'Novo contato'}
          </Badge>
          {card.origem && <Badge variant="secondary" className="text-[10px]">{card.origem}</Badge>}
        </div>

        {(card.cliente_id || card.lojista_id) && (
          <Button variant="outline" size="sm" className="mt-3 w-full gap-1.5 text-xs" onClick={abrirCadastro}>
            Abrir cadastro
            <ArrowUpRight className="h-3 w-3" />
          </Button>
        )}
      </div>

      <div className="space-y-3 border-b border-border/60 p-4">
        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-muted-foreground">Etapa</label>
          <Select value={card.etapa} onValueChange={mudarEtapa}>
            <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              {(['comercial', 'operacao'] as CrmPipeline[]).map((p) => (
                <SelectGroup key={p}>
                  <SelectLabel className="text-[10px] uppercase tracking-wide">
                    {p === 'comercial' ? 'Comercial' : 'Operação'}
                  </SelectLabel>
                  {ETAPAS_POR_PIPELINE[p].map((e) => (
                    <SelectItem key={e.id} value={e.id} className="text-xs">{e.titulo}</SelectItem>
                  ))}
                </SelectGroup>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Pedidos</p>
            <p className="text-sm font-semibold tabular-nums">{card.pedidos_historico ?? 0}</p>
          </div>
          <div className="rounded-lg bg-card p-2">
            <p className="text-[10px] text-muted-foreground">Faturamento</p>
            <p className="text-sm font-semibold tabular-nums">{moeda(card.faturamento_historico ?? 0)}</p>
          </div>
        </div>

        {card.pedido_numero && (
          <div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 p-2.5">
            <Package className="h-4 w-4 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium">Pedido #{card.pedido_numero} em aberto</p>
              {card.pedido_valor !== null && (
                <p className="text-[11px] text-muted-foreground">{moeda(card.pedido_valor)}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="border-b border-border/60 p-4">
        <Textarea
          rows={2}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) salvar(); }}
          placeholder="Anotar algo sobre este contato..."
          className="resize-none text-xs"
        />
        <Button
          size="sm"
          className="mt-2 w-full gap-1.5 text-xs"
          onClick={salvar}
          disabled={!nota.trim() || salvandoNota}
        >
          {salvandoNota ? <Loader2 className="h-3 w-3 animate-spin" /> : <StickyNote className="h-3 w-3" />}
          Salvar anotação
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 p-4">
        <p className="mb-3 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Histórico
        </p>
        {interacoes.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nada registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {interacoes.map((i) => {
              const Icone = ICONE_TIPO[i.tipo];
              return (
                <div key={i.id} className="flex gap-2.5">
                  <div className={cn(
                    'mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full',
                    i.tipo === 'nota' ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                      : i.tipo === 'pedido' ? 'bg-primary/15 text-primary'
                      : 'bg-secondary text-muted-foreground',
                  )}>
                    <Icone className="h-3 w-3" />
                  </div>
                  <div className="min-w-0 flex-1 border-b border-border/40 pb-3">
                    <p className="text-xs leading-snug">{i.descricao}</p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {i.autor ?? 'Sistema'} · {quando(i.created_at)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
