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
      {/* Action Bar */}
      <div className="flex justify-end">
        <Button onClick={() => setShowNovaTransacao(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Despesa
        </Button>
      </div>

      {/* Transactions List */}
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
