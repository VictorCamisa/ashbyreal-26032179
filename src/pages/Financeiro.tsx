import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { TrendingUp, CreditCard, Building2, Users, Beer, PieChart, Wallet } from 'lucide-react';
import { DashboardFinanceiro } from '@/components/financeiro/DashboardFinanceiro';
import { DespesasParticulares } from '@/components/financeiro/DespesasParticulares';
import { FinanceiroLoja } from '@/components/financeiro/FinanceiroLoja';
import { ControleCartoes } from '@/components/financeiro/ControleCartoes';
import { PedidosAshby } from '@/components/financeiro/PedidosAshby';
import { HorasExtras } from '@/components/financeiro/HorasExtras';
import { VisaoConsolidada } from '@/components/financeiro/VisaoConsolidada';

const tabs = [
  { id: 'dashboard', label: 'Dashboard', icon: PieChart },
  { id: 'particular', label: 'Particular', icon: Wallet },
  { id: 'loja', label: 'Loja', icon: Building2 },
  { id: 'cartoes', label: 'Cartões', icon: CreditCard },
  { id: 'ashby', label: 'Ashby', icon: Beer },
  { id: 'horas', label: 'Horas', icon: Users },
  { id: 'consolidado', label: 'Consolidado', icon: TrendingUp },
];

const Financeiro = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Wallet className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-lg font-semibold">Financeiro</h1>
          <p className="text-sm text-muted-foreground">Controle de finanças</p>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="flex items-center gap-1 p-1 rounded-xl bg-muted/30 border border-border/50 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap
              ${activeTab === tab.id 
                ? 'bg-background text-foreground shadow-sm' 
                : 'text-muted-foreground hover:text-foreground'
              }
            `}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <div className="animate-fade-in">
        {activeTab === 'dashboard' && <DashboardFinanceiro />}
        {activeTab === 'particular' && <DespesasParticulares />}
        {activeTab === 'loja' && <FinanceiroLoja />}
        {activeTab === 'cartoes' && <ControleCartoes />}
        {activeTab === 'ashby' && <PedidosAshby />}
        {activeTab === 'horas' && <HorasExtras />}
        {activeTab === 'consolidado' && <VisaoConsolidada />}
      </div>
    </div>
  );
};

export default Financeiro;