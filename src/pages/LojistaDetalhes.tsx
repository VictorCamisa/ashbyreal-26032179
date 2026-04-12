import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Store, Phone, Mail, User, ArrowLeft, Pencil, Trash2, MessageSquare,
  ShoppingCart, Circle, Calendar, DollarSign, Plus, Unlink, Package,
  MapPin, FileText, MoreVertical, TrendingUp, AlertTriangle, Clock,
  CheckCircle2, XCircle, Loader2, Receipt, ExternalLink, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLojistaDetails } from '@/hooks/useLojistas';
import { useLojistas } from '@/hooks/useLojistas';
import { useBarrisDisponiveis } from '@/hooks/useBarris';
import { EditarLojistaDialog } from '@/components/lojistas/EditarLojistaDialog';
import { NovoPedidoCompletoDialog } from '@/components/pedidos/NovoPedidoCompletoDialog';
import { supabase } from '@/integrations/supabase/client';
import { DetalhesPedidoDrawer } from '@/components/pedidos/DetalhesPedidoDrawer';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function getInitials(name: string) {
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
}

function getStatusBadge(status: string) {
  if (status === 'ativo') return { label: 'Ativo', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
  return { label: 'Inativo', cls: 'bg-muted text-muted-foreground' };
}

function getPedidoStatusBadge(status: string) {
  switch (status) {
    case 'entregue': return { variant: 'default' as const, icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0' };
    case 'cancelado': return { variant: 'destructive' as const, icon: XCircle, cls: 'bg-destructive/10 text-destructive border-0' };
    case 'pendente': return { variant: 'secondary' as const, icon: Clock, cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0' };
    default: return { variant: 'secondary' as const, icon: Package, cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0' };
  }
}

function getNotaStatusBadge(status: string) {
  switch (status) {
    case 'EMITIDA': return { label: 'Emitida', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0' };
    case 'CANCELADA': return { label: 'Cancelada', cls: 'bg-destructive/10 text-destructive border-0' };
    case 'REJEITADA': return { label: 'Rejeitada', cls: 'bg-destructive/10 text-destructive border-0' };
    case 'RASCUNHO': return { label: 'Rascunho', cls: 'bg-muted text-muted-foreground border-0' };
    default: return { label: status, cls: 'bg-blue-100 text-blue-700 border-0' };
  }
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium break-all">{value}</p>
      </div>
    </div>
  );
}

function FiscalRow({ label, value, placeholder = '—', mono }: { label: string; value?: string | null; placeholder?: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-medium text-right", mono && "font-mono", !value && "text-muted-foreground/50")}>
        {value || placeholder}
      </span>
    </div>
  );
}

function formatRegime(v?: string | null) {
  const map: Record<string, string> = {
    'SIMPLES_NACIONAL': 'Simples Nacional', 'SIMPLES_NACIONAL_EXCESSO': 'Simples Nacional - Excesso',
    'LUCRO_PRESUMIDO': 'Lucro Presumido', 'LUCRO_REAL': 'Lucro Real', 'MEI': 'MEI',
  };
  return v ? (map[v] || v) : 'Não informado';
}

function formatContribuinte(v?: string | null) {
  const map: Record<string, string> = {
    'CONTRIBUINTE': 'Contribuinte', 'ISENTO': 'Isento', 'NAO_CONTRIBUINTE': 'Não Contribuinte',
  };
  return v ? (map[v] || v) : 'Não informado';
}

export default function LojistaDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data, isLoading, refetch } = useLojistaDetails(id || null);
  const { deleteLojista, isDeleting } = useLojistas();
  const { data: barrisDisponiveis = [] } = useBarrisDisponiveis();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [vincularDialogOpen, setVincularDialogOpen] = useState(false);
  const [novoPedidoOpen, setNovoPedidoOpen] = useState(false);
  const [selectedBarris, setSelectedBarris] = useState<string[]>([]);
  const [isVinculando, setIsVinculando] = useState(false);
  const [pdfViewUrl, setPdfViewUrl] = useState<string | null>(null);
  const [detalhesPedidoId, setDetalhesPedidoId] = useState<string | null>(null);
  const [showDetalhesPedido, setShowDetalhesPedido] = useState(false);

  const lojista = data?.lojista;
  const pedidos = data?.pedidos || [];
  const barris = data?.barris || [];
  const notas = data?.notas || [];

  const totalVendas = pedidos.reduce((acc, p) => acc + (p.valor_total || 0), 0);
  const pedidosPendentes = pedidos.filter(p => p.status === 'pendente').length;
  const barrisNaLoja = barris.filter(b => b.localizacao === 'CLIENTE').length;
  const barrisCheios = barris.filter(b => b.status_conteudo === 'CHEIO').length;

  const handleDelete = async () => {
    if (!id) return;
    try {
      await deleteLojista(id);
      navigate('/lojistas');
    } catch (e) {
      // handled in mutation
    }
  };

  const handleWhatsApp = () => {
    if (!lojista?.telefone) return;
    const number = lojista.telefone.replace(/\D/g, '');
    if (number) window.open(`https://wa.me/55${number}`, '_blank');
  };

  const handleEmail = () => {
    if (lojista?.email) window.open(`mailto:${lojista.email}`, '_blank');
  };

  const toggleBarril = (barrilId: string) => {
    setSelectedBarris(prev =>
      prev.includes(barrilId) ? prev.filter(x => x !== barrilId) : [...prev, barrilId]
    );
  };

  const handleVincularBarris = async () => {
    if (!id || selectedBarris.length === 0) return;
    setIsVinculando(true);
    try {
      for (const barrilId of selectedBarris) {
        await supabase.from('barris').update({
          localizacao: 'CLIENTE', lojista_id: id, cliente_id: null,
          data_ultima_movimentacao: new Date().toISOString()
        }).eq('id', barrilId);

        await supabase.from('barril_movimentacoes').insert({
          barril_id: barrilId, tipo_movimento: 'SAIDA', status_conteudo: 'CHEIO',
          localizacao_anterior: 'LOJA', localizacao_nova: 'CLIENTE',
          data_movimento: new Date().toISOString(),
          observacoes: `Vinculado ao lojista: ${lojista?.nome}`
        });
      }
      toast.success(`${selectedBarris.length} barril(is) vinculado(s)`);
      queryClient.invalidateQueries({ queryKey: ['barris'] });
      queryClient.invalidateQueries({ queryKey: ['lojista-details', id] });
      refetch();
      setVincularDialogOpen(false);
      setSelectedBarris([]);
    } catch {
      toast.error('Erro ao vincular barris');
    } finally {
      setIsVinculando(false);
    }
  };

  const handleDesvincularBarril = async (barrilId: string) => {
    try {
      await supabase.from('barris').update({
        localizacao: 'LOJA', lojista_id: null, cliente_id: null,
        status_conteudo: 'VAZIO', data_ultima_movimentacao: new Date().toISOString()
      }).eq('id', barrilId);

      await supabase.from('barril_movimentacoes').insert({
        barril_id: barrilId, tipo_movimento: 'RETORNO', status_conteudo: 'VAZIO',
        localizacao_anterior: 'CLIENTE', localizacao_nova: 'LOJA',
        data_movimento: new Date().toISOString(),
        observacoes: `Desvinculado do lojista: ${lojista?.nome}`
      });

      toast.success('Barril devolvido para a loja');
      queryClient.invalidateQueries({ queryKey: ['barris'] });
      queryClient.invalidateQueries({ queryKey: ['lojista-details', id] });
      refetch();
    } catch {
      toast.error('Erro ao desvincular barril');
    }
  };

  const handleEmitirNota = () => {
    // Navigate to accounting module with lojista pre-selected
    navigate('/contabilidade', { state: { lojistaId: id, action: 'emitir_nota' } });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-[100px] rounded-xl" />)}
        </div>
        <Skeleton className="h-[400px] rounded-xl" />
      </div>
    );
  }

  if (!lojista) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Store className="h-16 w-16 text-muted-foreground/30" />
        <h2 className="text-xl font-semibold text-muted-foreground">Lojista não encontrado</h2>
        <Button variant="outline" onClick={() => navigate('/lojistas')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
        </Button>
      </div>
    );
  }

  const statusInfo = getStatusBadge(lojista.status);
  const endereco = lojista.endereco as any;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Breadcrumb & Back */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 h-8" onClick={() => navigate('/lojistas')}>
          <ArrowLeft className="h-3.5 w-3.5" />
          Lojistas
        </Button>
        <span>/</span>
        <span className="text-foreground font-medium truncate">{lojista.nome_fantasia || lojista.nome}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="size-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
            {getInitials(lojista.nome)}
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold tracking-tight">{lojista.nome_fantasia || lojista.nome}</h1>
              <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase tracking-wider border-0", statusInfo.cls)}>
                {statusInfo.label}
              </Badge>
            </div>
            {lojista.nome_fantasia && (
              <p className="text-sm text-muted-foreground mt-0.5">{lojista.nome}</p>
            )}
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {lojista.cnpj && (
                <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{lojista.cnpj}</span>
              )}
              {lojista.data_cadastro && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Desde {format(new Date(lojista.data_cadastro), "MMM yyyy", { locale: ptBR })}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Button size="sm" className="gap-1.5" onClick={() => setNovoPedidoOpen(true)}>
            <ShoppingCart className="h-3.5 w-3.5" /> Novo Pedido
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEmitirNota}>
            <Receipt className="h-3.5 w-3.5" /> Emitir Nota
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5 text-[#075E54] border-[#25D366]/30 bg-[#25D366]/5 hover:bg-[#25D366]/10" onClick={handleWhatsApp}>
            <MessageSquare className="h-3.5 w-3.5" /> WhatsApp
          </Button>
          {lojista.email && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleEmail}>
              <Mail className="h-3.5 w-3.5" /> E-mail
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Editar Cadastro
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/pedidos`)}>
                <ShoppingCart className="h-4 w-4 mr-2" /> Ver Todos Pedidos
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/contabilidade`)}>
                <FileText className="h-4 w-4 mr-2" /> Ir p/ Contabilidade
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteDialogOpen(true)}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir Lojista
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary/10"><DollarSign className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Total Vendas</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">
                  R$ {totalVendas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100 dark:bg-blue-900/30"><ShoppingCart className="h-5 w-5 text-blue-600 dark:text-blue-400" /></div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Pedidos</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">{pedidos.length}</p>
                {pedidosPendentes > 0 && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">{pedidosPendentes} pendente(s)</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100 dark:bg-amber-900/30"><Circle className="h-5 w-5 text-amber-600 dark:text-amber-400" /></div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Barris</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">{barrisNaLoja}</p>
                {barrisCheios > 0 && <p className="text-xs text-muted-foreground">{barrisCheios} cheio(s)</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/30"><Receipt className="h-5 w-5 text-emerald-600 dark:text-emerald-400" /></div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Notas Fiscais</p>
                <p className="text-2xl font-bold tabular-nums mt-0.5">{notas.length}</p>
                {notas.filter(n => n.status === 'EMITIDA').length > 0 && (
                  <p className="text-xs text-muted-foreground">{notas.filter(n => n.status === 'EMITIDA').length} emitida(s)</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Contact & Fiscal Info */}
        <div className="space-y-4">
          {/* Contact */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Informações de Contato
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <InfoRow icon={Phone} label="Telefone" value={lojista.telefone} />
              {lojista.telefone_secundario && (
                <InfoRow icon={Phone} label="Telefone 2" value={lojista.telefone_secundario} />
              )}
              {lojista.email && <InfoRow icon={Mail} label="E-mail" value={lojista.email} />}
              {lojista.contato_responsavel && <InfoRow icon={User} label="Responsável" value={lojista.contato_responsavel} />}
              {endereco && (endereco.rua || endereco.cidade) && (
                <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/50">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground">Endereço</p>
                    <p className="text-sm font-medium">
                      {[endereco.rua, endereco.numero].filter(Boolean).join(', ')}
                      {endereco.complemento && ` - ${endereco.complemento}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {[endereco.bairro, endereco.cidade, endereco.estado].filter(Boolean).join(' - ')}
                      {endereco.cep && ` | CEP: ${endereco.cep}`}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fiscal */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Dados Fiscais
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5">
              <FiscalRow label="CNPJ" value={lojista.cnpj} mono />
              <FiscalRow label="Razão Social" value={lojista.razao_social || lojista.nome} />
              <FiscalRow label="Inscrição Estadual" value={lojista.inscricao_estadual} placeholder="Não informada" />
              <FiscalRow label="Inscrição Municipal" value={lojista.inscricao_municipal} placeholder="Não informada" />
              <FiscalRow label="Regime Tributário" value={formatRegime(lojista.regime_tributario)} />
              <FiscalRow label="Contribuinte ICMS" value={formatContribuinte(lojista.contribuinte_icms)} />
              {lojista.suframa && <FiscalRow label="SUFRAMA" value={lojista.suframa} mono />}
              
              {/* Fiscal completeness warning */}
              {(!lojista.cnpj || !endereco?.rua || !endereco?.cidade) && (
                <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/30 mt-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-400">Dados incompletos para NF-e</p>
                    <p className="text-[10px] text-amber-600/80 dark:text-amber-500 mt-0.5">
                      {[!lojista.cnpj && 'CNPJ', !endereco?.rua && 'Endereço', !lojista.inscricao_estadual && 'IE'].filter(Boolean).join(', ')} pendente(s)
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {lojista.observacoes && (
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  Observações
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{lojista.observacoes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right: Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="pedidos" className="w-full">
            <TabsList className="w-full grid grid-cols-3 h-11">
              <TabsTrigger value="pedidos" className="gap-2 text-sm">
                <ShoppingCart className="h-4 w-4" />
                Pedidos ({pedidos.length})
              </TabsTrigger>
              <TabsTrigger value="notas" className="gap-2 text-sm">
                <Receipt className="h-4 w-4" />
                Notas ({notas.length})
              </TabsTrigger>
              <TabsTrigger value="barris" className="gap-2 text-sm">
                <Circle className="h-4 w-4" />
                Barris ({barris.length})
              </TabsTrigger>
            </TabsList>

            {/* == PEDIDOS TAB == */}
            <TabsContent value="pedidos" className="mt-4 space-y-3">
              <Button onClick={() => setNovoPedidoOpen(true)} className="w-full gap-2">
                <Plus className="h-4 w-4" /> Lançar Novo Pedido
              </Button>

              {pedidos.length === 0 ? (
                <Card className="shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <ShoppingCart className="h-12 w-12 mb-3 opacity-30" />
                    <p className="font-medium">Nenhum pedido encontrado</p>
                    <p className="text-xs mt-1">Clique acima para lançar o primeiro pedido</p>
                  </CardContent>
                </Card>
              ) : (
                pedidos.map(pedido => {
                  const statusBadge = getPedidoStatusBadge(pedido.status);
                  const StatusIcon = statusBadge.icon;
                  return (
                    <Card key={pedido.id} className="shadow-sm hover:shadow-md transition-shadow cursor-pointer" onClick={() => { setDetalhesPedidoId(pedido.id); setShowDetalhesPedido(true); }}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <StatusIcon className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-sm">#{pedido.numero_pedido}</span>
                                <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase", statusBadge.cls)}>
                                  {pedido.status}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {format(new Date(pedido.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                <span>{pedido.pedido_itens?.length || 0} itens</span>
                              </div>
                            </div>
                          </div>
                          <p className="text-lg font-bold tabular-nums">
                            R$ {(pedido.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        {pedido.pedido_itens && pedido.pedido_itens.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-border">
                            <div className="flex flex-wrap gap-1.5">
                              {pedido.pedido_itens.slice(0, 4).map((item: any, idx: number) => (
                                <span key={idx} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">
                                  {item.quantidade}x {item.produtos?.nome || 'Produto'}
                                </span>
                              ))}
                              {pedido.pedido_itens.length > 4 && (
                                <span className="text-[10px] text-muted-foreground">+{pedido.pedido_itens.length - 4} mais</span>
                              )}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* == NOTAS FISCAIS TAB == */}
            <TabsContent value="notas" className="mt-4 space-y-3">
              <Button onClick={handleEmitirNota} className="w-full gap-2">
                <Plus className="h-4 w-4" /> Emitir Nova Nota Fiscal
              </Button>

              {notas.length === 0 ? (
                <Card className="shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Receipt className="h-12 w-12 mb-3 opacity-30" />
                    <p className="font-medium">Nenhuma nota fiscal encontrada</p>
                    <p className="text-xs mt-1">Notas emitidas para este lojista aparecerão aqui</p>
                  </CardContent>
                </Card>
              ) : (
                notas.map(nota => {
                  const statusBadge = getNotaStatusBadge(nota.status);
                  return (
                    <Card key={nota.id} className="shadow-sm hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-muted">
                              <Receipt className="h-4 w-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">
                                  {nota.tipo === 'NFE' ? 'NF-e' : nota.tipo === 'NFCE' ? 'NFC-e' : nota.tipo === 'NFSE' ? 'NFS-e' : nota.tipo}
                                </span>
                                {nota.numero && (
                                  <span className="font-mono text-xs text-muted-foreground">#{nota.numero}</span>
                                )}
                                <Badge variant="outline" className={cn("text-[10px] font-semibold uppercase", statusBadge.cls)}>
                                  {statusBadge.label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {nota.data_emissao
                                    ? format(new Date(nota.data_emissao), "dd/MM/yyyy", { locale: ptBR })
                                    : format(new Date(nota.created_at), "dd/MM/yyyy", { locale: ptBR })}
                                </span>
                                {nota.chave_acesso && (
                                  <span className="font-mono text-[9px] hidden sm:inline truncate max-w-[180px]">
                                    {nota.chave_acesso}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-lg font-bold tabular-nums">
                              R$ {(nota.valor_total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                            {nota.pdf_url && (
                              <Button
                                variant="ghost" size="icon" className="h-8 w-8"
                                onClick={(e) => { e.stopPropagation(); setPdfViewUrl(nota.pdf_url); }}
                                title="Ver PDF"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </TabsContent>

            {/* == BARRIS TAB == */}
            <TabsContent value="barris" className="mt-4 space-y-4">
              <Button onClick={() => setVincularDialogOpen(true)} className="w-full gap-2" disabled={barrisDisponiveis.length === 0}>
                <Plus className="h-4 w-4" /> Vincular Barril
              </Button>

              {barris.length === 0 ? (
                <Card className="shadow-sm">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                    <Circle className="h-12 w-12 mb-3 opacity-30" />
                    <p className="font-medium">Nenhum barril vinculado</p>
                    <p className="text-xs mt-1">Clique em "Vincular Barril" para adicionar</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {barris.map(barril => (
                    <Card key={barril.id} className="shadow-sm group relative">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg", barril.status_conteudo === 'CHEIO' ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted')}>
                              <Circle className={cn("h-5 w-5", barril.status_conteudo === 'CHEIO' ? 'text-amber-600 fill-amber-600' : 'text-muted-foreground')} />
                            </div>
                            <div>
                              <p className="font-mono font-bold text-sm">{barril.codigo}</p>
                              <p className="text-xs text-muted-foreground">{barril.capacidade}L</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={barril.status_conteudo === 'CHEIO' ? 'default' : 'secondary'} className="text-[10px]">
                              {barril.status_conteudo}
                            </Badge>
                            <Button
                              variant="ghost" size="icon"
                              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={() => handleDesvincularBarril(barril.id)}
                              title="Devolver barril para loja"
                            >
                              <Unlink className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Edit Dialog */}
      <EditarLojistaDialog
        lojista={lojista}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['lojista-dashboard'] });
        }}
      />

      {/* Novo Pedido Dialog */}
      <NovoPedidoCompletoDialog
        open={novoPedidoOpen}
        onOpenChange={setNovoPedidoOpen}
        onSuccess={() => {
          refetch();
          queryClient.invalidateQueries({ queryKey: ['pedidos'] });
        }}
        preSelectedLojistaId={id}
      />

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir lojista?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Todos os dados de <strong>{lojista.nome}</strong> serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Vincular Barris Dialog */}
      <Dialog open={vincularDialogOpen} onOpenChange={(v) => { setVincularDialogOpen(v); if (!v) setSelectedBarris([]); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Vincular Barris</DialogTitle>
          </DialogHeader>
          <div className="max-h-[300px] overflow-y-auto space-y-2 py-2">
            {barrisDisponiveis.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum barril disponível na loja</p>
            ) : (
              barrisDisponiveis.map(b => (
                <label key={b.id} className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                  <Checkbox checked={selectedBarris.includes(b.id)} onCheckedChange={() => toggleBarril(b.id)} />
                  <div className="flex-1">
                    <span className="font-mono font-bold text-sm">{b.codigo}</span>
                    <span className="text-xs text-muted-foreground ml-2">{b.capacidade}L</span>
                  </div>
                  <Badge variant={b.status_conteudo === 'CHEIO' ? 'default' : 'secondary'} className="text-[10px]">
                    {b.status_conteudo}
                  </Badge>
                </label>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVincularDialogOpen(false); setSelectedBarris([]); }}>Cancelar</Button>
            <Button onClick={handleVincularBarris} disabled={selectedBarris.length === 0 || isVinculando}>
              {isVinculando ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Vincular {selectedBarris.length > 0 ? `(${selectedBarris.length})` : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PDF Viewer Dialog */}
      <Dialog open={!!pdfViewUrl} onOpenChange={(v) => { if (!v) setPdfViewUrl(null); }}>
        <DialogContent className="max-w-4xl h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Visualizar Documento
            </DialogTitle>
          </DialogHeader>
          {pdfViewUrl && (
            <iframe src={pdfViewUrl} className="w-full flex-1 rounded-lg border" style={{ minHeight: '60vh' }} />
          )}
        </DialogContent>
      </Dialog>

      {/* Detalhes do Pedido Drawer */}
      <DetalhesPedidoDrawer
        open={showDetalhesPedido}
        onOpenChange={setShowDetalhesPedido}
        pedidoId={detalhesPedidoId}
        clienteNome={lojista?.nome}
        onStatusChange={() => refetch()}
        onDelete={() => refetch()}
      />
    </div>
  );
}
