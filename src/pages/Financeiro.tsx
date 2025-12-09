import { useState } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Building2, 
  User, 
  Beer, 
  Users, 
  TrendingUp,
  ChevronRight,
  Plus,
  Receipt,
  ShoppingCart,
  Wallet
} from 'lucide-react';
import { DashboardFinanceiro } from '@/components/financeiro/DashboardFinanceiro';
import { DespesasParticulares } from '@/components/financeiro/DespesasParticulares';
import { FinanceiroLoja } from '@/components/financeiro/FinanceiroLoja';
import { ControleCartoes } from '@/components/financeiro/ControleCartoes';
import { PedidosAshby } from '@/components/financeiro/PedidosAshby';
import { HorasExtras } from '@/components/financeiro/HorasExtras';
import { VisaoConsolidada } from '@/components/financeiro/VisaoConsolidada';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NovoGastoCartaoDialog } from '@/components/financeiro/NovoGastoCartaoDialog';
import { NovaTransacaoDialog } from '@/components/financeiro/NovaTransacaoDialog';
import { useCartoes } from '@/hooks/useCartoes';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';
import { useTransacoes } from '@/hooks/useTransacoes';

const menuItems = [
  { 
    id: 'dashboard', 
    label: 'Visão Geral', 
    icon: LayoutDashboard,
    description: 'Dashboard financeiro'
  },
  { 
    id: 'cartoes', 
    label: 'Cartões', 
    icon: CreditCard,
    description: 'Faturas e gastos',
    highlight: true
  },
  { 
    id: 'loja', 
    label: 'Loja', 
    icon: Building2,
    description: 'Receitas e despesas'
  },
  { 
    id: 'particular', 
    label: 'Particular', 
    icon: User,
    description: 'Despesas pessoais'
  },
  { 
    id: 'ashby', 
    label: 'Ashby', 
    icon: Beer,
    description: 'Pedidos de cerveja'
  },
  { 
    id: 'horas', 
    label: 'Horas Extras', 
    icon: Users,
    description: 'Controle de ponto'
  },
  { 
    id: 'consolidado', 
    label: 'Consolidado', 
    icon: TrendingUp,
    description: 'Comparativo geral'
  },
];

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuickGasto, setShowQuickGasto] = useState(false);
  const [showQuickTransacao, setShowQuickTransacao] = useState(false);
  
  const { cartoes } = useCartoes();
  const { createGasto, isCreating: isCreatingGasto } = useGastosCartaoMutations();
  const { entity, createTransaction, isCreating: isCreatingTransacao } = useTransacoes('PARTICULAR', 'PAGAR');

  const activeItem = menuItems.find(item => item.id === activeTab);

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* Sidebar Navigation */}
      <aside className="w-72 shrink-0">
        <div className="glass-card p-4 sticky top-24">
          {/* Quick Actions */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Ações Rápidas
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-auto py-3 flex-col gap-1 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => setShowQuickGasto(true)}
              >
                <CreditCard className="h-4 w-4 text-primary" />
                <span className="text-xs">Gasto Cartão</span>
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-auto py-3 flex-col gap-1 hover:bg-primary/5 hover:border-primary/30"
                onClick={() => setShowQuickTransacao(true)}
              >
                <Receipt className="h-4 w-4 text-primary" />
                <span className="text-xs">Nova Despesa</span>
              </Button>
            </div>
          </div>

          {/* Menu Items */}
          <div className="space-y-1">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
              Módulos
            </h3>
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all group",
                  activeTab === item.id 
                    ? "bg-primary text-primary-foreground shadow-md" 
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground",
                  item.highlight && activeTab !== item.id && "border border-primary/20 bg-primary/5"
                )}
              >
                <div className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center shrink-0",
                  activeTab === item.id 
                    ? "bg-primary-foreground/20" 
                    : item.highlight 
                      ? "bg-primary/10" 
                      : "bg-muted/50 group-hover:bg-muted"
                )}>
                  <item.icon className={cn(
                    "h-4 w-4",
                    activeTab === item.id 
                      ? "text-primary-foreground" 
                      : item.highlight 
                        ? "text-primary" 
                        : ""
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    activeTab === item.id ? "text-primary-foreground" : ""
                  )}>
                    {item.label}
                  </p>
                  <p className={cn(
                    "text-xs truncate",
                    activeTab === item.id ? "text-primary-foreground/70" : "text-muted-foreground"
                  )}>
                    {item.description}
                  </p>
                </div>
                <ChevronRight className={cn(
                  "h-4 w-4 shrink-0 transition-transform",
                  activeTab === item.id 
                    ? "text-primary-foreground" 
                    : "text-muted-foreground/50",
                  activeTab === item.id && "translate-x-0.5"
                )} />
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {/* Content Header */}
        <header className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              {activeItem && <activeItem.icon className="h-5 w-5 text-primary" />}
            </div>
            <div>
              <h1 className="text-xl font-semibold">{activeItem?.label}</h1>
              <p className="text-sm text-muted-foreground">{activeItem?.description}</p>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && <DashboardFinanceiro />}
          {activeTab === 'particular' && <DespesasParticulares />}
          {activeTab === 'loja' && <FinanceiroLoja />}
          {activeTab === 'cartoes' && <ControleCartoes />}
          {activeTab === 'ashby' && <PedidosAshby />}
          {activeTab === 'horas' && <HorasExtras />}
          {activeTab === 'consolidado' && <VisaoConsolidada />}
        </div>
      </main>

      {/* Quick Action Dialogs */}
      <NovoGastoCartaoDialog
        open={showQuickGasto}
        onOpenChange={setShowQuickGasto}
        cartoes={cartoes || []}
        onSave={(gasto) => {
          createGasto(gasto);
          setShowQuickGasto(false);
        }}
        isLoading={isCreatingGasto}
      />

      {entity && (
        <NovaTransacaoDialog
          open={showQuickTransacao}
          onOpenChange={setShowQuickTransacao}
          entityId={entity.id}
          tipo="PAGAR"
          onSave={(transaction) => {
            createTransaction(transaction);
            setShowQuickTransacao(false);
          }}
          isLoading={isCreatingTransacao}
        />
      )}
    </div>
  );
};

export default Financeiro;
