import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import { TrendingUp, CreditCard, Building2, Users, Beer, Calendar, PieChart, Wallet } from 'lucide-react';
import { DashboardFinanceiro } from '@/components/financeiro/DashboardFinanceiro';
import { DespesasParticulares } from '@/components/financeiro/DespesasParticulares';
import { FinanceiroLoja } from '@/components/financeiro/FinanceiroLoja';
import { ControleCartoes } from '@/components/financeiro/ControleCartoes';
import { PedidosAshby } from '@/components/financeiro/PedidosAshby';
import { HorasExtras } from '@/components/financeiro/HorasExtras';
import { VisaoConsolidada } from '@/components/financeiro/VisaoConsolidada';
const Financeiro = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-center text-primary">Gestão Financeira</h1>
          <p className="text-muted-foreground">Controle completo de finanças da loja e particulares</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-7 w-full">
          <TabsTrigger value="dashboard" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Dashboard
          </TabsTrigger>
          <TabsTrigger value="particular" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Particular
          </TabsTrigger>
          <TabsTrigger value="loja" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Loja
          </TabsTrigger>
          <TabsTrigger value="cartoes" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Cartões
          </TabsTrigger>
          <TabsTrigger value="ashby" className="flex items-center gap-2">
            <Beer className="h-4 w-4" />
            Ashby
          </TabsTrigger>
          <TabsTrigger value="horas" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Horas Extras
          </TabsTrigger>
          <TabsTrigger value="consolidado" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Consolidado
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dashboard">
          <DashboardFinanceiro />
        </TabsContent>

        <TabsContent value="particular">
          <DespesasParticulares />
        </TabsContent>

        <TabsContent value="loja">
          <FinanceiroLoja />
        </TabsContent>

        <TabsContent value="cartoes">
          <ControleCartoes />
        </TabsContent>

        <TabsContent value="ashby">
          <PedidosAshby />
        </TabsContent>

        <TabsContent value="horas">
          <HorasExtras />
        </TabsContent>

        <TabsContent value="consolidado">
          <VisaoConsolidada />
        </TabsContent>
      </Tabs>
    </div>;
};
export default Financeiro;