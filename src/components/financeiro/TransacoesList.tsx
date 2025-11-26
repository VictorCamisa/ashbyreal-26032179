import { Card, CardContent } from '@/components/ui/card';
import { useTransacoes } from '@/hooks/useTransacoes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { EditarTransacaoDialog } from './EditarTransacaoDialog';
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

interface TransacoesListProps {
  entityType: 'LOJA' | 'PARTICULAR';
  tipo: 'PAGAR' | 'RECEBER';
}

export function TransacoesList({ entityType, tipo }: TransacoesListProps) {
  const { transacoes, isLoading, updateTransaction, deleteTransaction, isDeleting } = useTransacoes(entityType, tipo);
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Carregando...</p>
        </CardContent>
      </Card>
    );
  }

  if (!transacoes || transacoes.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-muted-foreground">Nenhuma transação encontrada.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data Venc.</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Conta</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transacoes.map((transacao) => (
                <TableRow key={transacao.id}>
                  <TableCell className="font-medium">
                    {new Date(transacao.due_date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{transacao.description}</p>
                      {transacao.notes && (
                        <p className="text-sm text-muted-foreground">{transacao.notes}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {(transacao.categories as any)?.name || '-'}
                  </TableCell>
                  <TableCell>
                    {(transacao.accounts as any)?.name || '-'}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    R$ {Number(transacao.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={
                      transacao.status === 'PAGO' ? 'default' : 
                      transacao.status === 'PREVISTO' ? 'secondary' : 
                      transacao.status === 'ATRASADO' ? 'destructive' :
                      'outline'
                    }>
                      {transacao.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setEditingTransaction(transacao)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeletingId(transacao.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
