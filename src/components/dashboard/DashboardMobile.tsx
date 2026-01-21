import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
    success: 'bg-emerald-500/10 text-emerald-600',
    warning: 'bg-amber-500/10 text-amber-600',
    destructive: 'bg-red-500/10 text-red-600',
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-card border">
      <div className={cn("p-2 rounded-lg", colorClasses[color])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{label}</p>
        <p className="text-base font-semibold">{value}</p>
        {subValue && <p className="text-[10px] text-muted-foreground">{subValue}</p>}
      </div>
      {trend !== undefined && (
        <div className={cn(
          "flex items-center gap-0.5 text-xs font-medium",
          trend >= 0 ? "text-emerald-600" : "text-red-500"
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
    <Card className="overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">{title}</span>
          {badge !== undefined && (
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
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
        <CardContent className="pt-0 pb-3 px-3 animate-fade-in">
          {children}
        </CardContent>
      )}
    </Card>
  );
}

export function DashboardMobile({ dashboardData, isLoading, children }: DashboardMobileProps) {
  const navigate = useNavigate();

  if (isLoading || !dashboardData) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-xl" />
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
    { 
      label: 'Escanear Boleto', 
      icon: Camera, 
      onClick: () => navigate('/financeiro'),
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    { 
      label: 'Novo Lead', 
      icon: UserPlus, 
      onClick: () => navigate('/crm'),
      color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
    },
    { 
      label: 'Entregas', 
      icon: Truck, 
      onClick: () => navigate('/pedidos'),
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
    { 
      label: 'Novo Pedido', 
      icon: Receipt, 
      onClick: () => navigate('/pedidos'),
      color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
    },
  ];

  return (
    <div className="space-y-3">
      {/* Quick Actions - Prominent at top */}
      <div className="grid grid-cols-4 gap-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            onClick={action.onClick}
            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-card border hover:bg-muted/50 transition-colors active:scale-95"
          >
            <div className={cn("p-2 rounded-lg", action.color)}>
              <action.icon className="h-4 w-4" />
            </div>
            <span className="text-[10px] font-medium text-center leading-tight">{action.label}</span>
          </button>
        ))}
      </div>

      {/* Quick balance card */}
      <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
        <CardContent className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Saldo do Mês</p>
              <p className={cn(
                "text-xl font-bold",
                saldo >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"
              )}>
                {formatCurrency(saldo)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-muted-foreground">Ticket Médio</p>
              <p className="text-sm font-semibold">{formatCurrency(ticketMedio)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main KPIs - Always visible */}
      <div className="grid grid-cols-2 gap-2">
        <MobileKPICard
          icon={DollarSign}
          label="Receitas"
          value={formatCurrency(dashboardData.financeiro?.receitas)}
          trend={dashboardData.vendas?.tendencia}
          color="success"
        />
        <MobileKPICard
          icon={DollarSign}
          label="Despesas"
          value={formatCurrency(dashboardData.financeiro?.despesas)}
          color="destructive"
        />
        <MobileKPICard
          icon={ShoppingCart}
          label="Pedidos"
          value={dashboardData.pedidos?.total ?? 0}
          subValue={`${dashboardData.pedidos?.pendentes ?? 0} pendentes`}
          color="primary"
        />
        <MobileKPICard
          icon={Users}
          label="Clientes"
          value={dashboardData.clientes?.total ?? 0}
          subValue={`${dashboardData.clientes?.novos ?? 0} novos`}
          color="primary"
        />
      </div>

      {/* Alerts Section - Open by default if there are alerts */}
      <CollapsibleSection 
        title="Alertas" 
        icon={AlertTriangle}
        defaultOpen={(dashboardData.financeiro?.atrasadas ?? 0) > 0 || (dashboardData.estoque?.alertas ?? 0) > 0}
        badge={(dashboardData.financeiro?.atrasadas ?? 0) + (dashboardData.estoque?.alertas ?? 0)}
      >
        {children?.alerts || (
          <div className="space-y-2">
            {(dashboardData.financeiro?.atrasadas ?? 0) > 0 && (
              <div className="flex items-center justify-between p-2 bg-destructive/10 rounded-lg">
                <span className="text-xs">Transações atrasadas</span>
                <Badge variant="destructive" className="text-[10px]">
                  {dashboardData.financeiro?.atrasadas}
                </Badge>
              </div>
            )}
            {(dashboardData.estoque?.alertas ?? 0) > 0 && (
              <div className="flex items-center justify-between p-2 bg-amber-500/10 rounded-lg">
                <span className="text-xs">Produtos em alerta</span>
                <Badge variant="secondary" className="text-[10px]">
                  {dashboardData.estoque?.alertas}
                </Badge>
              </div>
            )}
            {(dashboardData.financeiro?.atrasadas ?? 0) === 0 && (dashboardData.estoque?.alertas ?? 0) === 0 && (
              <p className="text-xs text-muted-foreground text-center py-2">
                Nenhum alerta no momento 🎉
              </p>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* WhatsApp Section */}
      <CollapsibleSection 
        title="WhatsApp" 
        icon={MessageCircle}
        badge={dashboardData.whatsapp?.naoLidas || undefined}
      >
        {children?.whatsapp || (
          <div className="flex items-center gap-3">
            <div className={cn(
              "h-2 w-2 rounded-full",
              dashboardData.whatsapp?.isConnected ? "bg-emerald-500" : "bg-destructive"
            )} />
            <div className="flex-1">
              <p className="text-xs">
                {dashboardData.whatsapp?.isConnected ? 'Conectado' : 'Desconectado'}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {dashboardData.whatsapp?.conversasAtivas ?? 0} conversas ativas
              </p>
            </div>
            {(dashboardData.whatsapp?.naoLidas ?? 0) > 0 && (
              <Badge variant="destructive" className="text-[10px]">
                {dashboardData.whatsapp?.naoLidas} não lidas
              </Badge>
            )}
          </div>
        )}
      </CollapsibleSection>

      {/* Charts Section */}
      <CollapsibleSection title="Gráficos" icon={BarChart3}>
        <div className="space-y-3">
          {children?.comparison}
          {children?.evolution}
        </div>
      </CollapsibleSection>

      {/* Categories Section */}
      <CollapsibleSection title="Categorias" icon={PieChart}>
        {children?.category || (
          <div className="space-y-2">
            {dashboardData.topCategoriasDespesa?.slice(0, 5).map((cat: any, i: number) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-xs truncate flex-1">{cat.name}</span>
                <span className="text-xs font-medium">{formatCurrency(cat.value)}</span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Pedidos Section */}
      <CollapsibleSection 
        title="Pedidos" 
        icon={ShoppingCart}
        badge={dashboardData.pedidos?.pendentes || undefined}
      >
        {children?.pedidos || (
          <div className="space-y-2">
            {Object.entries(dashboardData.pedidos?.byStatus || {}).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <span className="text-xs capitalize">{status.toLowerCase().replace('_', ' ')}</span>
                <Badge variant="secondary" className="text-[10px]">{count as number}</Badge>
              </div>
            ))}
          </div>
        )}
      </CollapsibleSection>

      {/* Rankings Section */}
      <CollapsibleSection title="Rankings" icon={Activity}>
        {children?.rankings || (
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Top Clientes</p>
              {dashboardData.topClientes?.slice(0, 3).map((c: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-xs truncate flex-1">{c.nome}</span>
                  <span className="text-xs font-medium">{formatCurrency(c.total)}</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase mb-1">Top Produtos</p>
              {dashboardData.topProdutos?.slice(0, 3).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-1">
                  <span className="text-xs truncate flex-1">{p.nome}</span>
                  <span className="text-xs font-medium">{p.quantidade}x</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleSection>
    </div>
  );
}