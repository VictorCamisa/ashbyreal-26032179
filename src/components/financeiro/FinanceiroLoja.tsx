import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TransacoesList } from './TransacoesList';
import { NovaTransacaoDialog } from './NovaTransacaoDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useTransacoes } from '@/hooks/useTransacoes';

export function FinanceiroLoja() {
  const [showNovaTransacao, setShowNovaTransacao] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'PAGAR' | 'RECEBER'>('PAGAR');
  const { entity, createTransaction, isCreating } = useTransacoes('LOJA', tipoTransacao);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Financeiro da Loja</h2>
          <p className="text-sm text-muted-foreground">Gerencie receitas e despesas da empresa</p>
        </div>
        <Button 
          onClick={() => setShowNovaTransacao(true)}
          size="lg"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      <Tabs 
        defaultValue="despesas" 
        onValueChange={(v) => setTipoTransacao(v === 'receitas' ? 'RECEBER' : 'PAGAR')}
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="despesas">Despesas</TabsTrigger>
          <TabsTrigger value="receitas">Receitas</TabsTrigger>
        </TabsList>

        <TabsContent value="despesas" className="mt-6">
          <TransacoesList entityType="LOJA" tipo="PAGAR" />
        </TabsContent>

        <TabsContent value="receitas" className="mt-6">
          <TransacoesList entityType="LOJA" tipo="RECEBER" />
        </TabsContent>
      </Tabs>

      {entity && (
        <NovaTransacaoDialog
          open={showNovaTransacao}
          onOpenChange={setShowNovaTransacao}
          entityId={entity.id}
          tipo={tipoTransacao}
          onSave={(transaction) => {
            createTransaction(transaction);
            setShowNovaTransacao(false);
          }}
          isLoading={isCreating}
        />
      )}
    </div>
  );
}
