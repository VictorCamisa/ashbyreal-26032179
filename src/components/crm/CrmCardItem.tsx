import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MessageCircle, Package, Store, User, UserPlus } from 'lucide-react';
import type { CrmCard } from '@/hooks/useCrmQuadro';

const TIPO = {
  lojista:       { label: 'Lojista', icone: Store,    cor: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
  cliente_final: { label: 'Cliente', icone: User,     cor: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' },
  desconhecido:  { label: 'Novo',    icone: UserPlus, cor: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
} as const;

const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

/** "há 5min", "há 3h", "há 2d" — o quadro é sobre o que está esfriando. */
function desde(iso: string | null) {
  if (!iso) return null;
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min}min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.round(h / 24)}d`;
}

export function CrmCardItem({ card }: { card: CrmCard }) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: card.id });
  const tipo = TIPO[card.tipo_contato];
  const Icone = tipo.icone;

  const abrir = () => {
    if (card.lojista_id) navigate(`/lojistas/${card.lojista_id}`);
    else if (card.cliente_id) navigate(`/clientes/${card.cliente_id}`);
  };

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...listeners}
      {...attributes}
      onDoubleClick={abrir}
      className={cn(
        'cursor-grab rounded-xl border bg-card p-3 transition-shadow active:cursor-grabbing',
        isDragging ? 'z-50 border-primary shadow-float' : 'border-border/60 hover:shadow-medium',
        card.aguardando_resposta && 'border-l-2 border-l-warning',
      )}
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{card.nome}</p>
          {card.telefone && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{card.telefone}</p>
          )}
        </div>
        <Badge variant="outline" className={cn('shrink-0 gap-1 px-1.5 text-[10px]', tipo.cor)}>
          <Icone className="h-2.5 w-2.5" />
          {tipo.label}
        </Badge>
      </div>

      {card.pedido_numero && (
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-primary/5 px-2 py-1.5">
          <Package className="h-3 w-3 shrink-0 text-primary" />
          <span className="text-[11px] font-medium">#{card.pedido_numero}</span>
          {card.pedido_valor !== null && (
            <span className="ml-auto text-[11px] font-semibold tabular-nums">{moeda(card.pedido_valor)}</span>
          )}
        </div>
      )}

      {card.ultima_mensagem && (
        <div className="mt-2 flex items-start gap-1.5">
          <MessageCircle className={cn(
            'mt-0.5 h-3 w-3 shrink-0',
            card.aguardando_resposta ? 'text-warning' : 'text-muted-foreground',
          )} />
          <p className="line-clamp-2 text-[11px] leading-snug text-muted-foreground">
            {card.ultima_mensagem}
          </p>
        </div>
      )}

      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>
          {(card.pedidos_historico ?? 0) > 0
            ? `${card.pedidos_historico} pedidos · ${moeda(card.faturamento_historico ?? 0)}`
            : card.origem ?? '—'}
        </span>
        {desde(card.ultima_mensagem_em) && <span>{desde(card.ultima_mensagem_em)}</span>}
      </div>
    </div>
  );
}
