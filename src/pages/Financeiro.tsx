import { useState } from 'react';
import { 
  LayoutDashboard, 
  CreditCard, 
  Building2, 
  User, 
  Beer, 
  Users, 
  TrendingUp,
  Plus,
  BookOpen
} from 'lucide-react';
import { DashboardFinanceiro } from '@/components/financeiro/DashboardFinanceiro';
import { DespesasParticulares } from '@/components/financeiro/DespesasParticulares';
import { FinanceiroLoja } from '@/components/financeiro/FinanceiroLoja';
import { ControleCartoes } from '@/components/financeiro/ControleCartoes';
import { PedidosAshby } from '@/components/financeiro/PedidosAshby';
import { HorasExtras } from '@/components/financeiro/HorasExtras';
import { VisaoConsolidada } from '@/components/financeiro/VisaoConsolidada';
import { DiarioCaixa } from '@/components/financeiro/DiarioCaixa';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { NovoGastoCartaoDialog } from '@/components/financeiro/NovoGastoCartaoDialog';
import { NovaTransacaoDialog } from '@/components/financeiro/NovaTransacaoDialog';
import { useCartoes } from '@/hooks/useCartoes';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';
import { useTransacoes } from '@/hooks/useTransacoes';

const tabs = [
  { id: 'dashboard', label: 'Visão Geral', icon: LayoutDashboard },
  { id: 'diario', label: 'Diário de Caixa', icon: BookOpen },
  { id: 'loja', label: 'Loja', icon: Building2 },
  { id: 'particular', label: 'Particular', icon: User },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'ashby', label: 'Ashby', icon: Beer },
  { id: 'horas', label: 'Horas Extras', icon: Users },
  { id: 'consolidado', label: 'Consolidado', icon: TrendingUp },
];

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showQuickGasto, setShowQuickGasto] = useState(false);
  const [showQuickTransacao, setShowQuickTransacao] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'PAGAR' | 'RECEBER'>('PAGAR');
  
  const { cartoes } = useCartoes();
  const { createGasto, isCreating: isCreatingGasto } = useGastosCartaoMutations();
  const { entity, createTransaction, isCreating: isCreatingTransacao } = useTransacoes('LOJA', tipoTransacao);

  const handleNovaReceita = () => {
    setTipoTransacao('RECEBER');
    setShowQuickTransacao(true);
  };

  const handleNovaDespesa = () => {
    setTipoTransacao('PAGAR');
    setShowQuickTransacao(true);
  };

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
          
          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
              onClick={handleNovaReceita}
            >
              <Plus className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Receita</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
              onClick={handleNovaDespesa}
            >
              <Plus className="h-4 w-4 text-destructive" />
              <span className="hidden sm:inline">Despesa</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              className="gap-2"
              onClick={() => setShowQuickGasto(true)}
            >
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="hidden sm:inline">Cartão</span>
            </Button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap",
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
        {activeTab === 'diario' && <DiarioCaixa />}
        {activeTab === 'particular' && <DespesasParticulares />}
        {activeTab === 'loja' && <FinanceiroLoja />}
        {activeTab === 'cartoes' && <ControleCartoes />}
        {activeTab === 'ashby' && <PedidosAshby />}
        {activeTab === 'horas' && <HorasExtras />}
        {activeTab === 'consolidado' && <VisaoConsolidada />}
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

      {entity && (
        <NovaTransacaoDialog
          open={showQuickTransacao}
          onOpenChange={setShowQuickTransacao}
          entityId={entity.id}
          tipo={tipoTransacao}
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
