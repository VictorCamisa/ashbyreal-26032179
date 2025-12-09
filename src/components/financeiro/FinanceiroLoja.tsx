import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Plus, ArrowDownRight, ArrowUpRight, Search, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { NovaTransacaoDialog } from './NovaTransacaoDialog';
import { EditarTransacaoDialog } from './EditarTransacaoDialog';
import { useTransacoes } from '@/hooks/useTransacoes';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function FinanceiroLoja() {
  const [showNovaTransacao, setShowNovaTransacao] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'PAGAR' | 'RECEBER'>('PAGAR');
  const [activeView, setActiveView] = useState<'despesas' | 'receitas'>('despesas');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [referenceMonth, setReferenceMonth] = useState(new Date());
  
  const monthStr = referenceMonth.toISOString().slice(0, 7);
  const { 
    transacoes, 
    entity, 
    createTransaction, 
    updateTransaction,
    deleteTransaction,
    isCreating,
    isDeleting 
  } = useTransacoes('LOJA', activeView === 'receitas' ? 'RECEBER' : 'PAGAR');

  const handleViewChange = (view: 'despesas' | 'receitas') => {
    setActiveView(view);
    setTipoTransacao(view === 'receitas' ? 'RECEBER' : 'PAGAR');
  };

  const handlePrevMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Filter transactions
  const filteredTransacoes = transacoes?.filter(t => {
    const matchesMonth = t.due_date?.slice(0, 7) === monthStr;
    const matchesSearch = !searchTerm || 
      t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.categories as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesMonth && matchesSearch;
  }) || [];

  // Calculate totals
  const totalValue = filteredTransacoes.reduce((acc, t) => acc + Number(t.amount), 0);
  const paidValue = filteredTransacoes.filter(t => t.status === 'PAGO').reduce((acc, t) => acc + Number(t.amount), 0);
  const pendingValue = filteredTransacoes.filter(t => t.status !== 'PAGO').reduce((acc, t) => acc + Number(t.amount), 0);

  const monthLabel = referenceMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Toggle and Month */}
        <div className="flex items-center gap-4">
          <div className="flex p-1 rounded-lg bg-muted/50">
            <button
              onClick={() => handleViewChange('despesas')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                activeView === 'despesas' 
                  ? "bg-background shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ArrowDownRight className={cn("h-4 w-4", activeView === 'despesas' && "text-destructive")} />
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
              <ArrowUpRight className={cn("h-4 w-4", activeView === 'receitas' && "text-emerald-600")} />
              Receitas
            </button>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[120px] text-center">
              {monthLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Button onClick={() => setShowNovaTransacao(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova {activeView === 'receitas' ? 'Receita' : 'Despesa'}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Total</p>
            <p className="text-lg font-bold mt-1">
              {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">{activeView === 'despesas' ? 'Pago' : 'Recebido'}</p>
            <p className="text-lg font-bold text-emerald-600 mt-1">
              {paidValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase">Pendente</p>
            <p className="text-lg font-bold text-amber-600 mt-1">
              {pendingValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar transação..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Transactions List */}
      <Card>
        <CardContent className="p-0">
          {filteredTransacoes.length > 0 ? (
            <div className="divide-y">
              {filteredTransacoes.map((t) => {
                const isOverdue = t.status === 'ATRASADO' || 
                  (t.status === 'PREVISTO' && new Date(t.due_date) < new Date());
                
                return (
                  <div 
                    key={t.id}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors",
                      isOverdue && "bg-destructive/5"
                    )}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        t.status === 'PAGO' ? "bg-emerald-500" : isOverdue ? "bg-destructive" : "bg-amber-500"
                      )} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{t.description || 'Sem descrição'}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {new Date(t.due_date).toLocaleDateString('pt-BR')}
                          </span>
                          {(t.categories as any)?.name && (
                            <Badge variant="outline" className="text-xs py-0 h-5">
                              {(t.categories as any)?.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={t.status === 'PAGO' ? 'default' : isOverdue ? 'destructive' : 'secondary'}
                        className="text-xs"
                      >
                        {t.status === 'PAGO' ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                      </Badge>
                      <span className={cn(
                        "text-sm font-semibold tabular-nums min-w-[100px] text-right",
                        activeView === 'receitas' ? "text-emerald-600" : ""
                      )}>
                        {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingTransaction(t)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletingId(t.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {searchTerm ? 'Nenhuma transação encontrada.' : 'Nenhuma transação cadastrada.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialogs */}
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

      <EditarTransacaoDialog
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
        onSave={(updates) => {
          updateTransaction(updates);
          setEditingTransaction(null);
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) {
                  deleteTransaction(deletingId);
                  setDeletingId(null);
                }
              }}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
