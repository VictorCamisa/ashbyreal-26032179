import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TransacoesList } from './TransacoesList';
import { NovaTransacaoDialog } from './NovaTransacaoDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function FinanceiroLoja() {
  const [showNovaTransacao, setShowNovaTransacao] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'PAGAR' | 'RECEBER'>('PAGAR');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Financeiro da Loja</h2>
        <Button onClick={() => setShowNovaTransacao(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      <Tabs defaultValue="despesas">
        <TabsList>
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
        </TabsList>

        <TabsContent value="despesas">
          <TransacoesList entityType="LOJA" tipo="PAGAR" />
        </TabsContent>

        <TabsContent value="receitas">
          <TransacoesList entityType="LOJA" tipo="RECEBER" />
        </TabsContent>
      </Tabs>

      <NovaTransacaoDialog
        open={showNovaTransacao}
        onOpenChange={setShowNovaTransacao}
        entityType="LOJA"
        tipo={tipoTransacao}
      />
    </div>
  );
}
