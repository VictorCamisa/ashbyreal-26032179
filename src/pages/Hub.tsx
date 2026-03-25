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
  Users,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUserModules } from '@/hooks/useAdminUsers';
import { usePedidos } from '@/hooks/usePedidos';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfWeek, endOfWeek, format, isWithinInterval, isPast, eachDayOfInterval, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ModuleItem {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const modules: ModuleItem[] = [
  { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart, description: 'Vendas, entregas e PDV', color: 'bg-primary/10 text-primary' },
  { key: 'crm', label: 'CRM', href: '/crm', icon: Target, description: 'Pipeline e leads', color: 'bg-success/10 text-success' },
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet, description: 'Contas e fluxo de caixa', color: 'bg-warning/10 text-warning' },
  { key: 'contabilidade', label: 'Contabilidade', href: '/contabilidade', icon: Calculator, description: 'Notas fiscais e DRE', color: 'bg-accent text-accent-foreground' },
];

export default function Hub() {
  const { user, signOut } = useAuth();
  const { data: visibleModules } = useUserModules();
  const { pedidos } = usePedidos();

  // Fetch clients map
  const { data: clientesMap = {} } = useQuery({
    queryKey: ['clientes-map-hub'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nome');
      const map: Record<string, string> = {};
      data?.forEach((c) => (map[c.id] = c.nome));
      return map;
    },
  });

  // Fetch transactions due this week
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

  const { data: transacoesSemana = [] } = useQuery({
    queryKey: ['transacoes-semana-hub', format(weekStart, 'yyyy-MM-dd')],
    queryFn: async () => {
      const { data } = await supabase
        .from('transactions')
        .select('id, description, amount, tipo, status, due_date')
        .gte('due_date', weekStart.toISOString())
        .lte('due_date', weekEnd.toISOString())
        .neq('status', 'CANCELADO')
        .order('due_date');
      return data || [];
    },
  });

  const filteredModules = useMemo(() => {
    if (!visibleModules) return modules;
    return modules.filter((m) => visibleModules.includes(m.key));
  }, [visibleModules]);

  // Week calculations
  const pedidosDaSemana = useMemo(() => {
    return pedidos.filter((p) => {
      const d = new Date(p.dataPedido);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    });
  }, [pedidos, weekStart, weekEnd]);

  const totalValor = pedidosDaSemana.reduce((acc, p) => acc + p.valorTotal, 0);
  const pedidosPendentes = pedidosDaSemana.filter((p) => p.status === 'pendente');
  const pedidosConfirmados = pedidosDaSemana.filter((p) => p.status === 'pago' || p.status === 'entregue');

  const wednesday = new Date(weekStart);
  wednesday.setDate(wednesday.getDate() + 2);
  wednesday.setHours(23, 59, 59);
  const deadlinePassed = isPast(wednesday);

  const friday = new Date(weekStart);
  friday.setDate(friday.getDate() + 4);

  const daysOfWeek = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Financial week summary
  const contasAPagar = transacoesSemana.filter(t => t.tipo === 'PAGAR' && t.status !== 'PAGO');
  const contasAReceber = transacoesSemana.filter(t => t.tipo === 'RECEBER' && t.status !== 'PAGO');
  const totalPagar = contasAPagar.reduce((a, t) => a + Number(t.amount), 0);
  const totalReceber = contasAReceber.reduce((a, t) => a + Number(t.amount), 0);

  const weekLabel = `${format(weekStart, "dd/MM", { locale: ptBR })} — ${format(weekEnd, "dd/MM", { locale: ptBR })}`;

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const firstName = user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/30">
        <div className="mx-auto max-w-5xl px-5 sm:px-8">
          <div className="flex items-center justify-between h-14">
            <span className="text-sm font-bold tracking-tight text-primary">Taubaté Chopp</span>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-medium truncate text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/configuracoes" className="cursor-pointer text-sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-destructive focus:text-destructive cursor-pointer text-sm"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-5 sm:px-8 py-8 space-y-8">
        {/* Greeting + Week Status */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 animate-fade-in">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{greeting}, {firstName}</p>
            <h2 className="text-2xl font-semibold tracking-tight">
              Semana {weekLabel}
            </h2>
          </div>
          <Badge
            variant={deadlinePassed ? "destructive" : "default"}
            className="self-start sm:self-auto text-xs gap-1.5"
          >
            {deadlinePassed ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
            {deadlinePassed ? 'Semana Fechada' : 'Coletando Pedidos'}
          </Badge>
        </div>

        {/* KPIs */}
        <KPIGrid>
          <KPICard
            label="Pedidos da Semana"
            value={pedidosDaSemana.length}
            icon={Package}
            subtitle={`${pedidosPendentes.length} pendentes`}
          />
          <KPICard
            label="Vendas da Semana"
            value={`R$ ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
            icon={DollarSign}
          />
          <KPICard
            label="Confirmados"
            value={pedidosConfirmados.length}
            icon={CheckCircle2}
            subtitle={`de ${pedidosDaSemana.length}`}
          />
          <KPICard
            label="Entrega"
            value={format(friday, "EEE dd/MM", { locale: ptBR })}
            icon={Truck}
          />
        </KPIGrid>

        {/* Week Timeline + Financial side by side */}
        <div className="grid gap-5 lg:grid-cols-5">
          {/* Timeline */}
          <Card className="lg:col-span-3">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Visão da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1.5">
                {daysOfWeek.map((day) => {
                  const isToday = isSameDay(day, now);
                  const isDeadline = isSameDay(day, wednesday);
                  const isDelivery = isSameDay(day, friday);
                  const dayPedidos = pedidosDaSemana.filter(p => isSameDay(new Date(p.dataPedido), day));

                  return (
                    <div
                      key={day.toISOString()}
                      className={cn(
                        "rounded-xl border p-2.5 min-h-[90px] text-center transition-colors",
                        isToday && "border-primary/40 bg-primary/5",
                        isDeadline && !isToday && "border-warning/40 bg-warning/5",
                        isDelivery && !isToday && "border-success/40 bg-success/5",
                        !isToday && !isDeadline && !isDelivery && "border-border/50"
                      )}
                    >
                      <p className={cn(
                        "text-xs font-semibold capitalize mb-0.5",
                        isToday ? "text-primary" : "text-muted-foreground"
                      )}>
                        {format(day, 'EEE', { locale: ptBR })}
                      </p>
                      <p className="text-[10px] text-muted-foreground mb-2">{format(day, 'dd/MM')}</p>
                      {isDeadline && (
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <AlertCircle className="h-3 w-3 text-warning" />
                          <span className="text-[9px] font-medium text-warning">Prazo</span>
                        </div>
                      )}
                      {isDelivery && (
                        <div className="flex items-center justify-center gap-1 mb-1">
                          <Truck className="h-3 w-3 text-success" />
                          <span className="text-[9px] font-medium text-success">Entrega</span>
                        </div>
                      )}
                      {dayPedidos.length > 0 ? (
                        <>
                          <div className="text-lg font-bold text-foreground">{dayPedidos.length}</div>
                          <div className="text-[10px] text-muted-foreground">
                            R$ {dayPedidos.reduce((a, p) => a + p.valorTotal, 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-muted-foreground/30 mt-2">—</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Financial Summary */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Financeiro da Semana</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 rounded-xl bg-success/5 border border-success/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">A Receber</span>
                  <TrendingUp className="h-3.5 w-3.5 text-success" />
                </div>
                <p className="text-lg font-bold text-success">
                  R$ {totalReceber.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">{contasAReceber.length} pendente{contasAReceber.length !== 1 ? 's' : ''}</p>
              </div>

              <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">A Pagar</span>
                  <Wallet className="h-3.5 w-3.5 text-destructive" />
                </div>
                <p className="text-lg font-bold text-destructive">
                  R$ {totalPagar.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-[10px] text-muted-foreground">{contasAPagar.length} pendente{contasAPagar.length !== 1 ? 's' : ''}</p>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-muted-foreground">Saldo da Semana</span>
                </div>
                <p className={cn(
                  "text-lg font-bold",
                  (totalReceber - totalPagar) >= 0 ? "text-success" : "text-destructive"
                )}>
                  R$ {(totalReceber - totalPagar).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Alerts */}
        {pedidosPendentes.length > 0 && !deadlinePassed && (
          <div className="flex items-center gap-3 p-4 rounded-xl border border-warning/30 bg-warning/5 animate-fade-in">
            <AlertCircle className="h-5 w-5 text-warning shrink-0" />
            <div>
              <p className="text-sm font-medium">
                {pedidosPendentes.length} pedido{pedidosPendentes.length > 1 ? 's' : ''} aguardando confirmação
              </p>
              <p className="text-xs text-muted-foreground">
                Confirme antes de quarta-feira para incluir na carga Ashby
              </p>
            </div>
            <NavLink to="/pedidos" className="ml-auto">
              <Button size="sm" variant="outline" className="text-xs gap-1">
                Ver pedidos <ArrowUpRight className="h-3 w-3" />
              </Button>
            </NavLink>
          </div>
        )}

        {/* Recent Orders */}
        {pedidosDaSemana.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">Últimos Pedidos</CardTitle>
                <NavLink to="/pedidos" className="text-xs text-primary hover:underline">Ver todos →</NavLink>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {pedidosDaSemana.slice(0, 5).map((pedido) => {
                  const statusColors: Record<string, string> = {
                    pendente: 'bg-warning/10 text-warning border-warning/20',
                    pago: 'bg-success/10 text-success border-success/20',
                    entregue: 'bg-primary/10 text-primary border-primary/20',
                    cancelado: 'bg-destructive/10 text-destructive border-destructive/20',
                  };
                  return (
                    <NavLink
                      key={pedido.id}
                      to="/pedidos"
                      className="flex items-center justify-between p-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-medium">
                          {clientesMap[pedido.clienteId] || 'Cliente N/I'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          #{(pedido as any).numeroPedido || pedido.id.slice(0, 8)} · {format(new Date(pedido.dataPedido), "dd/MM HH:mm")}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-primary">
                          R$ {pedido.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                        <Badge className={cn("text-xs border", statusColors[pedido.status] || '')}>
                          {pedido.status}
                        </Badge>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Access Modules */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">Módulos</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {filteredModules.map((item) => (
              <NavLink
                key={item.key}
                to={item.href}
                className="group flex flex-col p-4 rounded-xl bg-card border border-border/40 hover:border-primary/25 hover:shadow-medium transition-all duration-300"
              >
                <div className={`p-2 rounded-lg ${item.color} w-fit mb-3 transition-transform duration-300 group-hover:scale-110`}>
                  <item.icon className="h-4 w-4" />
                </div>
                <h4 className="text-sm font-semibold">{item.label}</h4>
                <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
              </NavLink>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
