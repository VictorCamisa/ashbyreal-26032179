import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronDown, 
  ChevronUp,
  TrendingUp, 
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  AlertTriangle,
  MessageCircle,
  BarChart3,
  PieChart,
  Activity,
  Camera,
  UserPlus,
  Truck,
  Receipt,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface DashboardMobileProps {
  dashboardData: any;
  isLoading: boolean;
  children?: {
    alerts?: React.ReactNode;
    whatsapp?: React.ReactNode;
    comparison?: React.ReactNode;
    category?: React.ReactNode;
    health?: React.ReactNode;
    evolution?: React.ReactNode;
    cashflow?: React.ReactNode;
    funnel?: React.ReactNode;
    rankings?: React.ReactNode;
    pedidos?: React.ReactNode;
  };
}

function MobileKPICard({ 
  icon: Icon, 
  label, 
  value, 
  subValue, 
  trend, 
  color = 'primary' 
}: { 
  icon: React.ElementType;
  label: string;
  value: string | number;
  subValue?: string;
  trend?: number;
  color?: 'primary' | 'success' | 'warning' | 'destructive';
}) {
  const colorClasses = {
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-amber-500/10 text-amber-500',
    destructive: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/50 kpi-glow">
      <div className={cn("p-2 rounded-xl", colorClasses[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold truncate">{label}</p>
        <p className="text-base font-extrabold tracking-tight">{value}</p>
        {subValue && <p className="text-[10px] text-muted-foreground">{subValue}</p>}
      </div>
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md",
          trend >= 0 ? "text-success bg-success/10" : "text-destructive bg-destructive/10"
        )}>
          {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
          {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}

function CollapsibleSection({ 
  title, 
  icon: Icon, 
  children, 
  defaultOpen = false,
  badge,
}: { 
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: string | number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl bg-card border border-border/50 overflow-hidden kpi-glow">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3.5 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-muted/50">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="text-sm font-bold">{title}</span>
          {badge !== undefined && (
            <Badge variant="secondary" className="text-[9px] px-1.5 py-0 font-bold rounded-md">
              {badge}
            </Badge>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {isOpen && (
        <div className="pt-0 pb-3.5 px-3.5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}

export function DashboardMobile({ dashboardData, isLoading, children }: DashboardMobileProps) {
  const navigate = useNavigate();

  if (isLoading || !dashboardData) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted/50 animate-pulse rounded-2xl" />
        ))}
      </div>
    );
  }

  const formatCurrency = (value: number | undefined | null) => {
    const safeValue = typeof value === 'number' && !isNaN(value) ? value : 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(safeValue);
  };

  const saldo = dashboardData.financeiro?.saldo ?? 0;
  const ticketMedio = dashboardData.vendas?.ticketMedio ?? 0;

  const quickActions = [
    { label: 'Boleto', icon: Camera, onClick: () => navigate('/financeiro'), color: 'bg-primary/10 text-primary' },
    { label: 'Lead', icon: UserPlus, onClick: () => navigate('/crm'), color: 'bg-chart-3/10 text-chart-3' },
    { label: 'Entregas', icon: Truck, onClick: () => navigate('/pedidos'), color: 'bg-success/10 text-success' },
    { label: 'Pedido', icon: Receipt, onClick: () => navigate('/pedidos'), color: 'bg-chart-2/10 text-chart-2' },
  ];

  return (
    <div className="space-y-3">
      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border/50 hover:bg-muted/30 transition-all active:scale-95 kpi-glow"
          >
            <div className={cn("p-2 rounded-xl", action.color)}>
              <action.icon className="h-4 w-4" />
            </div>
            <span className="text-[9px] font-bold text-center leading-tight">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Balance card */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-semibold">Saldo do Mês</p>
            <p className={cn(
              "text-2xl font-extrabold tracking-tight",
              saldo >= 0 ? "text-success" : "text-destructive"
            )}>
              {formatCurrency(saldo)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[9px] text-muted-foreground font-semibold">Ticket Médio</p>
            <p className="text-sm font-bold">{formatCurrency(ticketMedio)}</p>
          </div>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <MobileKPICard icon={DollarSign} label="Receitas" value={formatCurrency(dashboardData.financeiro?.receitas)} trend={dashboardData.vendas?.tendencia} color="success" />
        <MobileKPICard icon={DollarSign} label="Despesas" value={formatCurrency(dashboardData.financeiro?.despesas)} color="destructive" />
        <MobileKPICard icon={ShoppingCart} label="Pedidos" value={dashboardData.pedidos?.total ?? 0} subValue={`${dashboardData.pedidos?.pendentes ?? 0} pendentes`} color="primary" />
        <MobileKPICard icon={Users} label="Clientes" value={dashboardData.clientes?.total ?? 0} subValue={`${dashboardData.clientes?.novos ?? 0} novos`} color="primary" />
      </div>

      {/* Collapsible sections */}
      <CollapsibleSection 
        title="Alertas" icon={AlertTriangle}
        defaultOpen={(dashboardData.financeiro?.atrasadas ?? 0) > 0 || (dashboardData.estoque?.alertas ?? 0) > 0}
        badge={(dashboardData.financeiro?.atrasadas ?? 0) + (dashboardData.estoque?.alertas ?? 0)}
      >
        {children?.alerts || (
          <div className="space-y-2">
            {(dashboardData.financeiro?.atrasadas ?? 0) > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-destructive/5 rounded-xl border border-destructive/10">
                <span className="text-xs font-medium">Transações atrasadas</span>
                <Badge variant="destructive" className="text-[9px] font-bold">{dashboardData.financeiro?.atrasadas}</Badge>
              </div>
            )}
            {(dashboardData.estoque?.alertas ?? 0) > 0 && (
              <div className="flex items-center justify-between p-2.5 bg-amber-500/5 rounded-xl border border-amber-500/10">
                <span className="text-xs font-medium">Produtos em alerta</span>
                <Badge variant="secondary" className="text-[9px] font-bold">{dashboardData.estoque?.alertas}</Badge>
              </div>
            )}
            {(dashboardData.financeiro?.atrasadas ?? 0) === 0 && (dashboardData.estoque?.alertas ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground text-center py-3">Nenhum alerta no momento 🎉</p>
            )}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="WhatsApp" icon={MessageCircle} badge={dashboardData.whatsapp?.naoLidas || undefined}>
        {children?.whatsapp || (
          <div className="flex items-center gap-3">
            <div className={cn("h-2.5 w-2.5 rounded-full ring-2 ring-background", dashboardData.whatsapp?.isConnected ? "bg-success" : "bg-destructive")} />
            <div className="flex-1">
              <p className="text-xs font-medium">{dashboardData.whatsapp?.isConnected ? 'Conectado' : 'Desconectado'}</p>
              <p className="text-[10px] text-muted-foreground">{dashboardData.whatsapp?.conversasAtivas ?? 0} conversas ativas</p>
            </div>
            {(dashboardData.whatsapp?.naoLidas ?? 0) > 0 && (
              <Badge variant="destructive" className="text-[9px] font-bold">{dashboardData.whatsapp?.naoLidas} não lidas</Badge>
            )}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Gráficos" icon={BarChart3}>
        <div className="space-y-3">{children?.comparison}{children?.evolution}</div>
      </CollapsibleSection>

      <CollapsibleSection title="Categorias" icon={PieChart}>
        {children?.category || (
          <div className="space-y-2">
            {dashboardData.topCategoriasDespesa?.slice(0, 5).map((cat: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-1">
                <span className="text-xs truncate flex-1 font-medium">{cat.name}</span>
                <span className="text-xs font-bold">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Pedidos" icon={ShoppingCart} badge={dashboardData.pedidos?.pendentes || undefined}>
        {children?.pedidos || (
          <div className="space-y-2">
            {Object.entries(dashboardData.pedidos?.byStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between py-1">
                <span className="text-xs capitalize font-medium">{status.toLowerCase().replace('_', ' ')}</span>
                <Badge variant="secondary" className="text-[9px] font-bold">{count as number}</Badge>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Rankings" icon={Activity}>
        {children?.rankings || (
          <div className="space-y-3">
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-1.5">Top Clientes</p>
              {dashboardData.topClientes?.slice(0, 3).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-xs truncate flex-1 font-medium">{c.nome}</span>
                  <span className="text-xs font-bold">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[9px] text-muted-foreground uppercase tracking-wider font-bold mb-1.5">Top Produtos</p>
              {dashboardData.topProdutos?.slice(0, 3).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-xs truncate flex-1 font-medium">{p.nome}</span>
                  <span className="text-xs font-bold">{p.quantidade}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}
