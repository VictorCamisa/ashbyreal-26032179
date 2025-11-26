import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { TransacoesList } from './TransacoesList';
import { NovaTransacaoDialog } from './NovaTransacaoDialog';

export function DespesasParticulares() {
  const [showNovaTransacao, setShowNovaTransacao] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Despesas Particulares</h2>
        <Button onClick={() => setShowNovaTransacao(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Despesa
        </Button>
      </div>

      <TransacoesList entityType="PARTICULAR" tipo="PAGAR" />

      <NovaTransacaoDialog
        open={showNovaTransacao}
        onOpenChange={setShowNovaTransacao}
        entityType="PARTICULAR"
        tipo="PAGAR"
      />
    </div>
  );
}
