import { useState } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  ArrowLeftRight,
  BarChart3,
  Receipt,
  Plus,
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
import { PageLayout } from '@/components/layout/PageLayout';

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
    <PageLayout
      title="Financeiro"
      subtitle="Controle total das suas finanças"
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={handleTabChange}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span>Nova Entrada</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => setShowBoletoDialog(true)} className="gap-2 cursor-pointer">
              <Receipt className="h-4 w-4" />
              <span>Entrada Boleto</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowQuickGasto(true)} className="gap-2 cursor-pointer">
              <CreditCard className="h-4 w-4" />
              <span>Gasto Cartão</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
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
    </PageLayout>
  );
};

export default Financeiro;
