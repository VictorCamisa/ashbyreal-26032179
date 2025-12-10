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
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { NovoGastoCartaoDialog } from '@/components/financeiro/NovoGastoCartaoDialog';
import { EntradaBoletoDialog } from '@/components/financeiro/EntradaBoletoDialog';
import { useCartoes } from '@/hooks/useCartoes';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';
import { useTransacoes } from '@/hooks/useTransacoes';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'transacoes', label: 'Transações', icon: ArrowLeftRight },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'relatorios', label: 'Relatórios', icon: BarChart3 },
];

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuickGasto, setShowQuickGasto] = useState(false);
  const [showBoletoDialog, setShowBoletoDialog] = useState(false);
  
  const { cartoes } = useCartoes();
  const { createGasto, isCreating: isCreatingGasto } = useGastosCartaoMutations();
  const { createTransaction, isCreating: isCreatingTransaction } = useTransacoes('LOJA', 'PAGAR');

  return (
    <div className="space-y-6">
      {/* Header with Tabs */}
      <PageHeader
        title="Financeiro"
        subtitle="Controle suas finanças"
        icon={Wallet}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
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
        {activeTab === 'dashboard' && <DashboardFinanceiro />}
        {activeTab === 'transacoes' && <TransacoesUnificadas />}
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
        onSave={(transaction) => {
          createTransaction(transaction);
          setShowBoletoDialog(false);
        }}
        isLoading={isCreatingTransaction}
      />
    </div>
  );
};

export default Financeiro;
