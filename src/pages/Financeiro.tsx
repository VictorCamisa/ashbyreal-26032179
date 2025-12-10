import { useState } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowLeftRight,
  BarChart3,
  Plus
} from 'lucide-react';
import { DashboardFinanceiro } from '@/components/financeiro/DashboardFinanceiro';
import { TransacoesUnificadas } from '@/components/financeiro/TransacoesUnificadas';
import { ControleCartoes } from '@/components/financeiro/ControleCartoes';
import { Relatorios } from '@/components/financeiro/Relatorios';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NovoGastoCartaoDialog } from '@/components/financeiro/NovoGastoCartaoDialog';
import { useCartoes } from '@/hooks/useCartoes';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transacoes', label: 'Transações', icon: ArrowLeftRight },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
];

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuickGasto, setShowQuickGasto] = useState(false);
  
  const { cartoes } = useCartoes();
  const { createGasto, isCreating: isCreatingGasto } = useGastosCartaoMutations();

  return (
    <div className="space-y-6">
      {/* Header with Tabs and Actions */}
      <div className="flex flex-col gap-4">
        {/* Title and Quick Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Financeiro</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Controle suas finanças</p>
          </div>
          
          {/* Quick Action - Only Credit Card */}
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2"
            onClick={() => setShowQuickGasto(true)}
          >
            <CreditCard className="h-4 w-4 text-primary" />
            <span className="hidden sm:inline">Gasto Cartão</span>
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-background text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-background/50"
              )}
            >
              <tab.icon className={cn(
                "h-4 w-4",
                activeTab === tab.id && "text-primary"
              )} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="animate-fade-in">
        {activeTab === 'dashboard' && <DashboardFinanceiro />}
        {activeTab === 'transacoes' && <TransacoesUnificadas />}
        {activeTab === 'cartoes' && <ControleCartoes />}
        {activeTab === 'relatorios' && <Relatorios />}
      </div>

      {/* Quick Action Dialog */}
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
    </div>
  );
};

export default Financeiro;