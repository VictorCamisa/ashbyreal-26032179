import { Card, CardContent } from '@/components/ui/card';
import { useTransacoes } from '@/hooks/useTransacoes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Pencil, Trash2, Search, Filter, Calendar, ArrowUpDown } from 'lucide-react';
import { EditarTransacaoDialog } from './EditarTransacaoDialog';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { cn } from '@/lib/utils';

interface TransacoesListProps {
  entityType: 'LOJA' | 'PARTICULAR';
  tipo: 'PAGAR' | 'RECEBER';
}

export function TransacoesList({ entityType, tipo }: TransacoesListProps) {
  const { transacoes, isLoading, updateTransaction, deleteTransaction, isDeleting } = useTransacoes(entityType, tipo);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredTransacoes = transacoes?.filter(t => 
    t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.categories as any)?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Calculate totals
  const totalValue = filteredTransacoes.reduce((acc, t) => acc + Number(t.amount), 0);
  const paidValue = filteredTransacoes.filter(t => t.status === 'PAGO').reduce((acc, t) => acc + Number(t.amount), 0);
  const pendingValue = filteredTransacoes.filter(t => t.status !== 'PAGO').reduce((acc, t) => acc + Number(t.amount), 0);

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="p-8 text-center">
          <div className="animate-pulse text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Summary Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="text-lg font-semibold">
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
          <p className="text-xs text-muted-foreground">{tipo === 'PAGAR' ? 'Pago' : 'Recebido'}</p>
          <p className="text-lg font-semibold text-emerald-600">
            R$ {paidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20">
          <p className="text-xs text-muted-foreground">Pendente</p>
          <p className="text-lg font-semibold text-amber-600">
            R$ {pendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar transação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredTransacoes.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              {searchTerm ? 'Nenhuma transação encontrada.' : 'Nenhuma transação cadastrada.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card overflow-hidden">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="font-semibold">Data</TableHead>
                  <TableHead className="font-semibold">Descrição</TableHead>
                  <TableHead className="font-semibold">Categoria</TableHead>
                  <TableHead className="font-semibold">Conta</TableHead>
                  <TableHead className="text-right font-semibold">Valor</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransacoes.map((transacao) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  const dueDate = new Date(transacao.due_date);
                  dueDate.setHours(0, 0, 0, 0);
                  const diffDays = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
                  const isOverdue = transacao.status === 'ATRASADO' ||
                    (transacao.status === 'PREVISTO' && dueDate < today);
                  const isDueSoon = transacao.status === 'PREVISTO' && diffDays >= 0 && diffDays <= 5;

                  return (
                    <TableRow
                      key={transacao.id}
                      className={cn(
                        "transition-colors",
                        isOverdue && "bg-destructive/5",
                        isDueSoon && "bg-amber-500/5"
                      )}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {new Date(transacao.due_date).toLocaleDateString('pt-BR')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transacao.description || '-'}</p>
                          {transacao.notes && (
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {transacao.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-normal">
                          {(transacao.categories as any)?.name || '-'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {(transacao.accounts as any)?.name || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={cn(
                          "font-semibold",
                          tipo === 'RECEBER' ? "text-emerald-600" : ""
                        )}>
                          R$ {Number(transacao.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            "text-xs text-white",
                            transacao.status === 'PAGO' && "bg-emerald-500 hover:bg-emerald-600",
                            isOverdue && "bg-destructive hover:bg-destructive/90",
                            isDueSoon && !isOverdue && "bg-amber-500 hover:bg-amber-600",
                            !isOverdue && !isDueSoon && transacao.status === 'PREVISTO' && "bg-slate-400 hover:bg-slate-500",
                            transacao.status === 'CANCELADO' && "bg-muted text-muted-foreground hover:bg-muted",
                          )}
                        >
                          {transacao.status === 'PAGO' && 'Pago'}
                          {isOverdue && 'Atrasado'}
                          {isDueSoon && !isOverdue && 'Vence em breve'}
                          {!isOverdue && !isDueSoon && transacao.status === 'PREVISTO' && 'Previsto'}
                          {transacao.status === 'CANCELADO' && 'Cancelado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingTransaction(transacao)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(transacao.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
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
    </>
  );
}
