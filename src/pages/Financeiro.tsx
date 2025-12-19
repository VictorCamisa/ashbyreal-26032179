import { useState } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowLeftRight,
  BarChart3,
  Wallet,
  Receipt,
  Plus,
  Sparkles
} from 'lucide-react';
import { DashboardFinanceiro } from '@/components/financeiro/DashboardFinanceiro';
import { TransacoesUnificadas } from '@/components/financeiro/TransacoesUnificadas';
import { ControleCartoes } from '@/components/financeiro/ControleCartoes';
import { Relatorios } from '@/components/financeiro/Relatorios';
import { GerenciamentoBoletos } from '@/components/financeiro/GerenciamentoBoletos';
import { Button } from '@/components/ui/button';
import { NovoGastoCartaoDialog } from '@/components/financeiro/NovoGastoCartaoDialog';
import { EntradaBoletoDialog } from '@/components/financeiro/EntradaBoletoDialog';
import { useCartoes } from '@/hooks/useCartoes';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const tabs = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'boletos', label: 'Boletos', icon: Receipt },
  { id: 'transacoes', label: 'Transações', icon: ArrowLeftRight },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
];

export type TransactionFilter = 'all' | 'overdue' | 'pending';

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuickGasto, setShowQuickGasto] = useState(false);
  const [showBoletoDialog, setShowBoletoDialog] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<TransactionFilter>('all');
  
  const { cartoes } = useCartoes();
  const { createGasto, isCreating: isCreatingGasto } = useGastosCartaoMutations();

  const handleNavigateToTransactions = (filter: TransactionFilter) => {
    setTransactionFilter(filter);
    setActiveTab('transacoes');
  };

  const handleNavigateToCartoes = () => {
    setActiveTab('cartoes');
  };

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (tab !== 'transacoes') {
      setTransactionFilter('all');
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[hsl(var(--gradient-card-from))] via-background to-[hsl(var(--gradient-card-to))] border-b border-border/50">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        {/* Ambient glow effects */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[hsl(var(--gradient-start)/0.08)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-[hsl(var(--gradient-end)/0.06)] rounded-full blur-3xl" />
        
        <div className="relative px-6 lg:px-8 py-6 sm:py-8 max-w-[1920px] mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Title Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br from-[hsl(var(--gradient-hero-from))] to-[hsl(var(--gradient-hero-to))] flex items-center justify-center shadow-lg shadow-[hsl(var(--gradient-hero-from)/0.25)]">
                  <Wallet className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                </div>
                <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center animate-pulse">
                  <Sparkles className="h-2.5 w-2.5 text-white" />
                </div>
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground via-foreground to-foreground/60 bg-clip-text">
                  Financeiro
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  Controle total das suas finanças
                </p>
              </div>
            </div>
            
            {/* Quick Actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="gradient-primary" className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span>Nova Entrada</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => setShowBoletoDialog(true)} className="gap-2 cursor-pointer">
                  <Receipt className="h-4 w-4 text-primary" />
                  <span>Entrada Boleto</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowQuickGasto(true)} className="gap-2 cursor-pointer">
                  <CreditCard className="h-4 w-4 text-primary" />
                  <span>Gasto Cartão</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Navigation Tabs */}
          <div className="mt-6 -mb-[1px]">
            <nav className="flex gap-1 overflow-x-auto scrollbar-hide pb-px">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                      "relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all duration-200 whitespace-nowrap",
                      isActive 
                        ? "bg-background text-foreground border border-border/50 border-b-transparent shadow-sm" 
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )}
                  >
                    <tab.icon className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-primary" : "text-muted-foreground"
                    )} />
                    <span className="hidden sm:inline">{tab.label}</span>
                    <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                    {isActive && (
                      <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] rounded-full" />
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>

      {/* Content Area - Full width */}
      <div className="flex-1 px-6 lg:px-8 py-6 max-w-[1920px] mx-auto w-full">
        <div className="animate-fade-in">
          {activeTab === 'dashboard' && (
            <DashboardFinanceiro 
              onNavigateToTransactions={handleNavigateToTransactions}
              onNavigateToCartoes={handleNavigateToCartoes}
            />
          )}
          {activeTab === 'boletos' && <GerenciamentoBoletos />}
          {activeTab === 'transacoes' && (
            <TransacoesUnificadas 
              initialFilter={transactionFilter}
              onFilterChange={setTransactionFilter}
            />
          )}
          {activeTab === 'cartoes' && <ControleCartoes />}
          {activeTab === 'relatorios' && <Relatorios />}
        </div>
      </div>

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

      <EntradaBoletoDialog
        open={showBoletoDialog}
        onOpenChange={setShowBoletoDialog}
      />
    </div>
  );
};

export default Financeiro;
