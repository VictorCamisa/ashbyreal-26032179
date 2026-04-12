import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Search, Users, ShoppingCart, Circle, TrendingUp, Plus, MessageSquare, Mail, ArrowRight, Phone } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { PageLayout } from '@/components/layout/PageLayout';
import { NovoLojistaDialog } from '@/components/lojistas/NovoLojistaDialog';
import { useLojistaDashboard, LojistaDashboardItem } from '@/hooks/useLojistaDashboard';
import { cn } from '@/lib/utils';

function formatCurrency(v: number) {
  if (v >= 1000) return `R$ ${(v / 1000).toFixed(1)}k`;
  return `R$ ${v.toFixed(0)}`;
}

function formatCurrencyFull(v: number) {
  return `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
}

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function getLastOrderLabel(date: string | null) {
  if (!date) return 'Sem pedidos';
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
}

function getStatusInfo(lojista: LojistaDashboardItem) {
  if (lojista.status !== 'ativo') {
    return { label: 'Inativo', cls: 'bg-muted text-muted-foreground' };
  }
  if (lojista.pedidos_pendentes > 0) {
    return { label: 'Pendente', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' };
  }
  // Check if no orders in 30+ days
  if (lojista.ultimo_pedido) {
    const daysSince = (Date.now() - new Date(lojista.ultimo_pedido).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) {
      return { label: 'Atenção', cls: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' };
    }
  }
  return { label: 'Ativo', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
}

function handleWhatsApp(telefone: string) {
  const number = telefone.replace(/\D/g, '');
  if (number && number !== '0000000000') {
    window.open(`https://wa.me/55${number}`, '_blank');
  }
}

function handleEmail(email: string | null) {
  if (email) {
    window.open(`mailto:${email}`, '_blank');
  }
}

export default function Lojistas() {
  const { data, isLoading } = useLojistaDashboard();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativos' | 'pendentes' | 'inativos'>('todos');

  const items = data?.items || [];
  const kpis = data?.kpis;

  const filteredItems = useMemo(() => {
    return items.filter(l => {
      const matchSearch = !searchTerm || 
        l.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.nome_fantasia?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.telefone.includes(searchTerm);
      
      if (!matchSearch) return false;

      switch (statusFilter) {
        case 'ativos': return l.status === 'ativo' && l.pedidos_pendentes === 0;
        case 'pendentes': return l.pedidos_pendentes > 0;
        case 'inativos': return l.status !== 'ativo';
        default: return true;
      }
    });
  }, [items, searchTerm, statusFilter]);

  const openDetails = (id: string) => {
    navigate(`/lojistas/${id}`);
  };

  return (
    <PageLayout
      title="Gestão de Parceiros"
      subtitle="Controle seus lojistas e parceiros B2B"
      icon={Store}
      actions={
        <NovoLojistaDialog />
      }
    >
      <div className="space-y-6">
        {/* KPIs */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
          </div>
        ) : kpis && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pontos Ativos</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight mt-2">{kpis.ativos}</p>
              <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-medium">
                de {items.length} cadastrados
              </p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Faturamento Mês</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight mt-2">{formatCurrency(kpis.faturamentoMes)}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pedidos Pendentes</p>
              <p className={cn(
                "text-3xl font-semibold tabular-nums tracking-tight mt-2",
                kpis.pedidosPendentes > 0 && "text-amber-600 dark:text-amber-400"
              )}>{kpis.pedidosPendentes}</p>
              {kpis.pedidosPendentes > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-medium">Aguardando expedição</p>
              )}
            </div>
            <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Barris em Campo</p>
              <p className="text-3xl font-semibold tabular-nums tracking-tight mt-2">{kpis.barrisEmCampo}</p>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar restaurante, bar ou contato..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-10 rounded-xl"
            />
          </div>
          <div className="flex gap-1.5">
            {([
              { key: 'todos', label: 'Todos' },
              { key: 'ativos', label: 'Ativos' },
              { key: 'pendentes', label: 'Pendentes' },
              { key: 'inativos', label: 'Inativos' },
            ] as const).map(f => (
              <Button
                key={f.key}
                variant={statusFilter === f.key ? 'default' : 'outline'}
                size="sm"
                className="h-10 rounded-xl text-xs"
                onClick={() => setStatusFilter(f.key)}
              >
                {f.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Cards Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-[260px] rounded-xl" />)}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-16">
            <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhum lojista encontrado' : 'Nenhum lojista cadastrado'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map(lojista => {
              const status = getStatusInfo(lojista);
              const hasPending = lojista.pedidos_pendentes > 0;
              const hasValidPhone = lojista.telefone && lojista.telefone !== '0000000000';

              return (
                <article
                  key={lojista.id}
                  className={cn(
                    "bg-card rounded-xl border p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col relative overflow-hidden",
                    hasPending ? "border-amber-300/50 dark:border-amber-700/50" : "border-border"
                  )}
                >
                  {hasPending && (
                    <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
                  )}

                  {/* Header */}
                  <div className={cn("flex justify-between items-start mb-4", hasPending && "pl-1")}>
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="size-10 rounded-lg bg-muted border border-border flex items-center justify-center text-muted-foreground font-medium text-sm shrink-0">
                        {getInitials(lojista.nome)}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-base truncate leading-tight">
                          {lojista.nome_fantasia || lojista.nome}
                        </h3>
                        {hasValidPhone && (
                          <p className="text-xs text-muted-foreground mt-0.5">{lojista.telefone}</p>
                        )}
                      </div>
                    </div>
                    <Badge variant="outline" className={cn("shrink-0 text-[10px] font-semibold uppercase tracking-wider border-0", status.cls)}>
                      {status.label}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className={cn("grid grid-cols-3 gap-y-3 mb-5 flex-1", hasPending && "pl-1")}>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Último Pedido</p>
                      <p className="text-sm font-medium">{getLastOrderLabel(lojista.ultimo_pedido)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Faturamento</p>
                      <p className="text-sm font-medium tabular-nums">{formatCurrencyFull(lojista.faturamento_total)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-0.5">Barris</p>
                      <p className={cn(
                        "text-sm font-medium tabular-nums",
                        lojista.barris_count > 0 && lojista.barris_cheios === 0 && "text-amber-600 dark:text-amber-400"
                      )}>
                        {lojista.barris_count} un.
                        {lojista.barris_cheios > 0 && (
                          <span className="text-muted-foreground font-normal"> ({lojista.barris_cheios} cheios)</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className={cn("flex items-center gap-2 mt-auto pt-4 border-t border-border", hasPending && "pl-1")}>
                    <Button
                      size="sm"
                      className="flex-1 text-xs h-9 rounded-lg"
                      onClick={() => openDetails(lojista.id)}
                    >
                      {hasPending ? 'Ver Pedido' : 'Novo Pedido'}
                    </Button>
                    {hasValidPhone && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-9 px-3 rounded-lg text-xs gap-1.5 text-[#075E54] border-[#25D366]/30 bg-[#25D366]/5 hover:bg-[#25D366]/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleWhatsApp(lojista.telefone);
                        }}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                        Wpp
                      </Button>
                    )}
                    {lojista.email && (
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 rounded-lg shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEmail(lojista.email);
                        }}
                      >
                        <Mail className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-lg shrink-0"
                      onClick={() => openDetails(lojista.id)}
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {filteredItems.length} de {items.length} lojista(s)
        </p>
      </div>
    </PageLayout>
  );
}
