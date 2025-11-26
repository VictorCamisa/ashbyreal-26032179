import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TransacoesList } from './TransacoesList';
import { NovaTransacaoDialog } from './NovaTransacaoDialog';
import { useTransacoes } from '@/hooks/useTransacoes';

export function DespesasParticulares() {
  const [showNovaTransacao, setShowNovaTransacao] = useState(false);
  const { entity, createTransaction, isCreating } = useTransacoes('PARTICULAR', 'PAGAR');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Despesas Particulares</h2>
          <p className="text-sm text-muted-foreground">Controle suas despesas pessoais</p>
        </div>
        <Button onClick={() => setShowNovaTransacao(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      <TransacoesList entityType="PARTICULAR" tipo="PAGAR" />

      {entity && (
        <NovaTransacaoDialog
          open={showNovaTransacao}
          onOpenChange={setShowNovaTransacao}
          entityId={entity.id}
          tipo="PAGAR"
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
