import { useState } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowLeftRight,
  BarChart3,
  Wallet,
  Receipt
} from 'lucide-react';
import { DashboardFinanceiro } from '@/components/financeiro/DashboardFinanceiro';
import { TransacoesUnificadas } from '@/components/financeiro/TransacoesUnificadas';
import { ControleCartoes } from '@/components/financeiro/ControleCartoes';
import { Relatorios } from '@/components/financeiro/Relatorios';
import { GerenciamentoBoletos } from '@/components/financeiro/GerenciamentoBoletos';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { NovoGastoCartaoDialog } from '@/components/financeiro/NovoGastoCartaoDialog';
import { EntradaBoletoDialog } from '@/components/financeiro/EntradaBoletoDialog';
import { useCartoes } from '@/hooks/useCartoes';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
    // Reset filter when manually changing tabs
    if (tab !== 'transacoes') {
      setTransactionFilter('all');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <PageHeader
        title="Financeiro"
        subtitle="Controle suas finanças"
        icon={Wallet}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        actions={
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
              onClick={() => setShowBoletoDialog(true)}
            >
              <Receipt className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Entrada Boleto</span>
            </Button>
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
        }
      />

      {/* Content Area */}
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
