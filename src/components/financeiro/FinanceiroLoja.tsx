import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Plus, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { TransacoesList } from './TransacoesList';
import { NovaTransacaoDialog } from './NovaTransacaoDialog';
import { useTransacoes } from '@/hooks/useTransacoes';
import { cn } from '@/lib/utils';

export function FinanceiroLoja() {
  const [showNovaTransacao, setShowNovaTransacao] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'PAGAR' | 'RECEBER'>('PAGAR');
  const [activeView, setActiveView] = useState<'despesas' | 'receitas'>('despesas');
  const { entity, createTransaction, isCreating } = useTransacoes('LOJA', tipoTransacao);

  const handleViewChange = (view: 'despesas' | 'receitas') => {
    setActiveView(view);
    setTipoTransacao(view === 'receitas' ? 'RECEBER' : 'PAGAR');
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Toggle Buttons */}
        <div className="flex p-1 rounded-lg bg-muted/50 border border-border/50">
          <button
            onClick={() => handleViewChange('despesas')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeView === 'despesas' 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowDownRight className={cn(
              "h-4 w-4",
              activeView === 'despesas' && "text-destructive"
            )} />
            Despesas
          </button>
          <button
            onClick={() => handleViewChange('receitas')}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              activeView === 'receitas' 
                ? "bg-background shadow-sm text-foreground" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <ArrowUpRight className={cn(
              "h-4 w-4",
              activeView === 'receitas' && "text-emerald-600"
            )} />
            Receitas
          </button>
        </div>

        <Button onClick={() => setShowNovaTransacao(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova {activeView === 'receitas' ? 'Receita' : 'Despesa'}
        </Button>
      </div>

      {/* Transactions List */}
      <TransacoesList 
        entityType="LOJA" 
        tipo={activeView === 'receitas' ? 'RECEBER' : 'PAGAR'} 
      />

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
