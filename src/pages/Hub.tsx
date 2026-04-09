import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import {
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
  Calculator,
  Target,
  ArrowUpRight,
  Package,
  DollarSign,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Lock,
  Unlock,
  TrendingUp,
  TrendingDown,
  Users,
  Droplets,
  BarChart3,
  Gauge,
  Receipt,
  MessageSquare,
  Boxes,
  Bot,
} from 'lucide-react';
import { UserPlus } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Progress } from '@/components/ui/progress';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUserModules } from '@/hooks/useAdminUsers';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format, isWithinInterval, isPast, eachDayOfInterval, isSameDay, subWeeks } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const META_SEMANAL = 15000; // R$ meta semanal — pode virar config futuramente

interface ModuleItem {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const modules: ModuleItem[] = [
  { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart, description: 'Vendas e entregas' },
  { key: 'crm', label: 'CRM', href: '/crm', icon: Target, description: 'Pipeline e leads' },
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet, description: 'Contas e caixa' },
  { key: 'contabilidade', label: 'Contabilidade', href: '/contabilidade', icon: Calculator, description: 'NFs e DRE' },
  { key: 'estoque', label: 'Estoque', href: '/estoque', icon: Boxes, description: 'Produtos e controle' },
  { key: 'clientes', label: 'Clientes', href: '/clientes', icon: Users, description: 'Base de clientes' },
  { key: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageSquare, description: 'Conversas' },
  { key: 'agente-ia', label: 'Agente IA', href: '/agente-ia', icon: Bot, description: 'Automação' },
];

export default function Hub() {
  const { user, signOut } = useAuth();
  const { data: visibleModules } = useUserModules();

  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const prevWeekStart = subWeeks(weekStart, 1);
  const prevWeekEnd = subWeeks(weekEnd, 1);

  // ── All data in a single query hook ──
  const { data, isLoading } = useQuery({
    queryKey: ['hub-dashboard', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const [
        pedidosSemana,
        pedidosSemanaAnterior,
        itensSemana,
        itensSemanaAnterior,
        transacoesSemana,
        clientesMap,
        estoqueAlertas,
        whatsappStatus,
      ] = await Promise.all([
        // Pedidos da semana
        supabase.from('pedidos').select('id, cliente_id, status, valor_total, data_pedido, numero_pedido, metodo_pagamento, observacoes')
          .gte('data_pedido', weekStart.toISOString()).lte('data_pedido', weekEnd.toISOString()),
        // Pedidos semana anterior (para comparação)
        supabase.from('pedidos').select('id, valor_total')
          .gte('data_pedido', prevWeekStart.toISOString()).lte('data_pedido', prevWeekEnd.toISOString()),
        // Itens da semana (para litros)
        supabase.from('pedido_itens').select('quantidade, subtotal, preco_unitario, pedido_id, produtos(nome, capacidade_barril, tipo_produto, unidade_medida)')
          .gte('created_at', weekStart.toISOString()).lte('created_at', weekEnd.toISOString()),
        // Itens semana anterior
        supabase.from('pedido_itens').select('quantidade, produtos(capacidade_barril)')
          .gte('created_at', prevWeekStart.toISOString()).lte('created_at', prevWeekEnd.toISOString()),
        // Transações da semana
        supabase.from('transactions').select('id, description, amount, tipo, status, due_date')
          .gte('due_date', format(weekStart, 'yyyy-MM-dd')).lte('due_date', format(weekEnd, 'yyyy-MM-dd'))
          .neq('status', 'CANCELADO').order('due_date'),
        // Clientes
        supabase.from('clientes').select('id, nome'),
        // Estoque em alerta
        supabase.from('produtos').select('id, nome, estoque, estoque_minimo, estoque_litros').filter('ativo', 'eq', true),
        // WhatsApp
        supabase.from('whatsapp_instances').select('id, status').limit(1),
      ]);

      return {
        pedidos: pedidosSemana.data || [],
        pedidosAnterior: pedidosSemanaAnterior.data || [],
        itens: itensSemana.data || [],
        itensAnterior: itensSemanaAnterior.data || [],
        transacoes: transacoesSemana.data || [],
        clientes: clientesMap.data || [],
        produtos: estoqueAlertas.data || [],
        whatsapp: whatsappStatus.data?.[0] || null,
      };
    },
  });

  const filteredModules = useMemo(() => {
    if (!visibleModules) return modules;
    return modules.filter((m) => visibleModules.includes(m.key));
  }, [visibleModules]);

  // ── Derived calculations ──
  const clientesMapObj = useMemo(() => {
    const map: Record<string, string> = {};
    data?.clientes?.forEach(c => { map[c.id] = c.nome; });
    return map;
  }, [data?.clientes]);

  const pedidos = data?.pedidos || [];
  const transacoes = data?.transacoes || [];

  // Litros vendidos
  const calcLitros = (itens: any[]) => {
    return itens.reduce((acc, item) => {
      const cap = item.produtos?.capacidade_barril;
      if (cap && cap > 0) {
        return acc + (item.quantidade * cap);
      }
      return acc;
    }, 0);
  };
  const litrosSemana = calcLitros(data?.itens || []);
  const litrosAnterior = calcLitros(data?.itensAnterior || []);
  const litrosTrend = litrosAnterior > 0 ? ((litrosSemana - litrosAnterior) / litrosAnterior) * 100 : 0;

  // Faturamento
  const faturamento = pedidos.reduce((a, p) => a + Number(p.valor_total), 0);
  const faturamentoAnterior = (data?.pedidosAnterior || []).reduce((a: number, p: any) => a + Number(p.valor_total), 0);
  const metaProgress = META_SEMANAL > 0 ? Math.min((faturamento / META_SEMANAL) * 100, 100) : 0;
  const faltaMeta = Math.max(META_SEMANAL - faturamento, 0);

  // Clientes ativos (únicos que fizeram pedido)
  const clientesAtivos = new Set(pedidos.map(p => p.cliente_id).filter(Boolean)).size;
  const clientesAtivosAnteriorSet = new Set((data?.pedidosAnterior || []).map((p: any) => p.cliente_id).filter(Boolean));
  const clientesAtivosAnterior = clientesAtivosAnteriorSet.size;
  const clientesTrend = clientesAtivosAnterior > 0 ? ((clientesAtivos - clientesAtivosAnterior) / clientesAtivosAnterior) * 100 : 0;

  // Ticket médio
  const ticketMedio = pedidos.length > 0 ? faturamento / pedidos.length : 0;
  const ticketMedioAnterior = (data?.pedidosAnterior || []).length > 0 ? faturamentoAnterior / (data?.pedidosAnterior || []).length : 0;
  const ticketTrend = ticketMedioAnterior > 0 ? ((ticketMedio - ticketMedioAnterior) / ticketMedioAnterior) * 100 : 0;

  // Status breakdown
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    pedidos.forEach(p => { counts[p.status] = (counts[p.status] || 0) + 1; });
    return counts;
  }, [pedidos]);

  const pedidosPendentes = statusCounts['pendente'] || 0;
  const pedidosPagos = (statusCounts['pago'] || 0) + (statusCounts['entregue'] || 0);

  // Financial
  const contasAPagar = transacoes.filter(t => t.tipo === 'PAGAR' && t.status !== 'PAGO');
  const contasAReceber = transacoes.filter(t => t.tipo === 'RECEBER' && t.status !== 'PAGO');
  const totalPagar = contasAPagar.reduce((a, t) => a + Math.abs(Number(t.amount)), 0);
  const totalReceber = contasAReceber.reduce((a, t) => a + Math.abs(Number(t.amount)), 0);

  // Estoque alerts
  const produtosAlerta = (data?.produtos || []).filter(p => p.estoque <= p.estoque_minimo);

  // Timeline
  const wednesday = new Date(weekStart);
  wednesday.setDate(wednesday.getDate() + 2);
  wednesday.setHours(23, 59, 59);
  const deadlinePassed = isPast(wednesday);

  const friday = new Date(weekStart);
  friday.setDate(friday.getDate() + 4);

  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekLabel = `${format(weekStart, "dd/MM", { locale: ptBR })} — ${format(weekEnd, "dd/MM", { locale: ptBR })}`;
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
  }, []);
  const firstName = user?.email?.split('@')[0] || 'Usuário';

  // Top produtos da semana
  const topProdutos = useMemo(() => {
    const map: Record<string, { nome: string; qtd: number; valor: number }> = {};
    (data?.itens || []).forEach((item: any) => {
      const nome = item.produtos?.nome || 'Produto';
      if (!map[nome]) map[nome] = { nome, qtd: 0, valor: 0 };
      map[nome].qtd += item.quantidade;
      map[nome].valor += Number(item.subtotal);
    });
    return Object.values(map).sort((a, b) => b.qtd - a.qtd).slice(0, 5);
  }, [data?.itens]);

  const formatCurrency = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  const formatCurrencyFull = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold tracking-tight text-primary">Taubaté Chopp</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">·</span>
              <span className="text-[10px] text-muted-foreground hidden sm:block">{weekLabel}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge
                variant={deadlinePassed ? "destructive" : "default"}
                className="text-[10px] gap-1 h-6"
              >
                {deadlinePassed ? <Lock className="h-2.5 w-2.5" /> : <Unlock className="h-2.5 w-2.5" />}
                {deadlinePassed ? 'Fechada' : 'Aberta'}
              </Badge>
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-xs truncate text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/configuracoes" className="cursor-pointer text-xs">
                      <Settings className="h-3.5 w-3.5 mr-2" /> Configurações
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive text-xs cursor-pointer">
                    <LogOut className="h-3.5 w-3.5 mr-2" /> Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Dense Content */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-4 space-y-4">
        {/* Row 1: Greeting minimal */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {greeting}, <span className="font-medium text-foreground">{firstName}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {format(now, "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </p>
        </div>

        {/* Row 2: 4 KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Litros vendidos */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Litros Vendidos</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{litrosSemana.toLocaleString('pt-BR')}L</p>
            <div className="flex items-center gap-2">
              {litrosTrend !== 0 && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                  litrosTrend > 0 ? "text-emerald-700 bg-emerald-500/10" : "text-red-600 bg-red-500/10"
                )}>
                  {litrosTrend > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(litrosTrend).toFixed(0)}%
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">vs sem. anterior</span>
            </div>
          </div>

          {/* Faturamento vs Meta */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Gauge className="h-3.5 w-3.5 text-primary" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Faturamento</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCurrency(faturamento)}</p>
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Meta: {formatCurrency(META_SEMANAL)}</span>
                <span className={cn(
                  "text-[10px] font-semibold",
                  metaProgress >= 100 ? "text-emerald-600" : metaProgress >= 70 ? "text-amber-600" : "text-red-500"
                )}>
                  {metaProgress.toFixed(0)}%
                </span>
              </div>
              <Progress value={metaProgress} className="h-1.5" />
              {faltaMeta > 0 && (
                <span className="text-[10px] text-muted-foreground">Faltam {formatCurrency(faltaMeta)}</span>
              )}
            </div>
          </div>

          {/* Clientes ativos */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-violet-500" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Clientes Ativos</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{clientesAtivos}</p>
            <div className="flex items-center gap-2">
              {clientesTrend !== 0 && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                  clientesTrend > 0 ? "text-emerald-700 bg-emerald-500/10" : "text-red-600 bg-red-500/10"
                )}>
                  {clientesTrend > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(clientesTrend).toFixed(0)}%
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">{pedidos.length} pedidos</span>
            </div>
          </div>

          {/* Ticket médio */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <div className="flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-amber-500" />
              <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">Ticket Médio</span>
            </div>
            <p className="text-2xl font-bold tabular-nums">{formatCurrencyFull(ticketMedio)}</p>
            <div className="flex items-center gap-2">
              {ticketTrend !== 0 && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded",
                  ticketTrend > 0 ? "text-emerald-700 bg-emerald-500/10" : "text-red-600 bg-red-500/10"
                )}>
                  {ticketTrend > 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                  {Math.abs(ticketTrend).toFixed(0)}%
                </span>
              )}
              <span className="text-[10px] text-muted-foreground">vs sem. anterior</span>
            </div>
          </div>
        </div>

        {/* Row 3: Timeline + Financial + Status */}
        <div className="grid gap-3 lg:grid-cols-12">
          {/* Week timeline */}
          <Card className="lg:col-span-5 border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Timeline da Semana</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-7 gap-1">
                {daysOfWeek.map((day) => {
                  const isToday = isSameDay(day, now);
                  const isDeadline = isSameDay(day, wednesday);
                  const isDelivery = isSameDay(day, friday);
                  const dayPedidos = pedidos.filter(p => isSameDay(new Date(p.data_pedido), day));
                  const dayVal = dayPedidos.reduce((a, p) => a + Number(p.valor_total), 0);

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "rounded-lg border p-1.5 text-center transition-all min-h-[72px] flex flex-col items-center justify-between",
                        isToday && "border-primary bg-primary/5 ring-1 ring-primary/20",
                        isDeadline && !isToday && "border-amber-400/60 bg-amber-500/5",
                        isDelivery && !isToday && "border-emerald-400/60 bg-emerald-500/5",
                        !isToday && !isDeadline && !isDelivery && "border-border/40"
                      )}
                    >
                      <div>
                        <p className={cn("text-[10px] font-bold capitalize", isToday ? "text-primary" : "text-muted-foreground")}>
                          {format(day, 'EEE', { locale: ptBR })}
                        </p>
                        <p className="text-[9px] text-muted-foreground/70">{format(day, 'dd')}</p>
                      </div>
                      <div>
                        {isDeadline && <AlertCircle className="h-3 w-3 text-amber-500 mx-auto" />}
                        {isDelivery && <Truck className="h-3 w-3 text-emerald-500 mx-auto" />}
                        {dayPedidos.length > 0 ? (
                          <>
                            <p className="text-sm font-bold">{dayPedidos.length}</p>
                            <p className="text-[8px] text-muted-foreground">{formatCurrency(dayVal)}</p>
                          </>
                        ) : (
                          <p className="text-[10px] text-muted-foreground/20">—</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Financial summary — compact */}
          <Card className="lg:col-span-3 border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                <div>
                  <p className="text-[10px] text-muted-foreground">A Receber</p>
                  <p className="text-sm font-bold text-emerald-600">{formatCurrencyFull(totalReceber)}</p>
                </div>
                <Badge variant="outline" className="text-[9px] h-5 border-emerald-500/30 text-emerald-600">{contasAReceber.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/15">
                <div>
                  <p className="text-[10px] text-muted-foreground">A Pagar</p>
                  <p className="text-sm font-bold text-red-500">{formatCurrencyFull(totalPagar)}</p>
                </div>
                <Badge variant="outline" className="text-[9px] h-5 border-red-500/30 text-red-500">{contasAPagar.length}</Badge>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/40">
                <div>
                  <p className="text-[10px] text-muted-foreground">Saldo</p>
                  <p className={cn("text-sm font-bold", (totalReceber - totalPagar) >= 0 ? "text-emerald-600" : "text-red-500")}>
                    {formatCurrencyFull(totalReceber - totalPagar)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status + Alerts */}
          <Card className="lg:col-span-4 border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Operacional</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 space-y-2">
              {/* Pedidos status */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 rounded-lg bg-amber-500/5 border border-amber-500/15">
                  <p className="text-lg font-bold text-amber-600">{pedidosPendentes}</p>
                  <p className="text-[9px] text-muted-foreground">Pendentes</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/15">
                  <p className="text-lg font-bold text-emerald-600">{pedidosPagos}</p>
                  <p className="text-[9px] text-muted-foreground">Confirmados</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-primary/5 border border-primary/15">
                  <p className="text-lg font-bold text-primary">{pedidos.length}</p>
                  <p className="text-[9px] text-muted-foreground">Total</p>
                </div>
              </div>

              {/* Alerts */}
              <div className="space-y-1.5">
                {pedidosPendentes > 0 && !deadlinePassed && (
                  <NavLink to="/pedidos" className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/15 hover:bg-amber-500/10 transition-colors">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                    <span className="text-[11px] flex-1">{pedidosPendentes} aguardando confirmação</span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                  </NavLink>
                )}
                {produtosAlerta.length > 0 && (
                  <NavLink to="/estoque" className="flex items-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/15 hover:bg-red-500/10 transition-colors">
                    <Package className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span className="text-[11px] flex-1">{produtosAlerta.length} produto{produtosAlerta.length > 1 ? 's' : ''} em alerta de estoque</span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                  </NavLink>
                )}
                {data?.whatsapp && data.whatsapp.status !== 'connected' && (
                  <NavLink to="/whatsapp" className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 border border-border/40 hover:bg-muted transition-colors">
                    <MessageSquare className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span className="text-[11px] flex-1">WhatsApp desconectado</span>
                    <ArrowUpRight className="h-3 w-3 text-muted-foreground" />
                  </NavLink>
                )}
                {deadlinePassed && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-primary/5 border border-primary/15">
                    <Lock className="h-3.5 w-3.5 text-primary shrink-0" />
                    <span className="text-[11px]">Prazo encerrado — entrega {format(friday, "EEE dd/MM", { locale: ptBR })}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Row 4: Pedidos recentes + Top produtos */}
        <div className="grid gap-3 lg:grid-cols-12">
          {/* Pedidos recentes */}
          <Card className="lg:col-span-8 border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pedidos da Semana</CardTitle>
                <NavLink to="/pedidos" className="text-[10px] text-primary hover:underline font-medium">Ver todos →</NavLink>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {pedidos.length > 0 ? (
                <div className="space-y-1">
                  {pedidos.slice(0, 8).map((pedido) => {
                    const statusMap: Record<string, { label: string; cls: string }> = {
                      pendente: { label: 'Pendente', cls: 'bg-amber-500/10 text-amber-600 border-amber-500/20' },
                      pago: { label: 'Pago', cls: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' },
                      entregue: { label: 'Entregue', cls: 'bg-blue-500/10 text-blue-600 border-blue-500/20' },
                      cancelado: { label: 'Cancelado', cls: 'bg-red-500/10 text-red-600 border-red-500/20' },
                    };
                    const st = statusMap[pedido.status] || { label: pedido.status, cls: 'bg-muted text-muted-foreground' };

                    return (
                      <div
                        key={pedido.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[10px] text-muted-foreground font-mono w-8 shrink-0">#{pedido.numero_pedido}</span>
                          <span className="text-xs font-medium truncate">{clientesMapObj[pedido.cliente_id] || '—'}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-xs font-semibold tabular-nums">{formatCurrency(Number(pedido.valor_total))}</span>
                          <Badge className={cn("text-[9px] h-5 border", st.cls)}>{st.label}</Badge>
                          <span className="text-[10px] text-muted-foreground">{format(new Date(pedido.data_pedido), "dd/MM")}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhum pedido esta semana</p>
              )}
            </CardContent>
          </Card>

          {/* Top produtos */}
          <Card className="lg:col-span-4 border-border/60">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Top Produtos</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {topProdutos.length > 0 ? (
                <div className="space-y-2">
                  {topProdutos.map((prod, i) => (
                    <div key={prod.nome} className="flex items-center gap-2">
                      <span className={cn(
                        "text-[10px] font-bold w-5 h-5 rounded flex items-center justify-center shrink-0",
                        i === 0 ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      )}>
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{prod.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{prod.qtd}× · {formatCurrency(prod.valor)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-6">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Row 5: Quick Access */}
        <div>
          <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Acesso Rápido</h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {/* Atalhos fixos: Clientes e Leads */}
            <NavLink
              to="/clientes"
              className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/30 hover:border-primary/20 hover:bg-primary/5 transition-all text-center"
            >
              <Users className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-medium">Clientes</span>
            </NavLink>
            <NavLink
              to="/crm"
              className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/30 hover:border-primary/20 hover:bg-primary/5 transition-all text-center"
            >
              <UserPlus className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-[10px] font-medium">Leads</span>
            </NavLink>
            {filteredModules.map((item) => (
              <NavLink
                key={item.key}
                to={item.href}
                className="group flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border border-border/30 hover:border-primary/20 hover:bg-primary/5 transition-all text-center"
              >
                <item.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
