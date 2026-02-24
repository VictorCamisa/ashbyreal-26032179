import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarClock, Loader2, Trash2 } from 'lucide-react';

interface ExcluirRecorrenteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionDescription?: string;
  onDeleteSingle: () => void;
  onDeleteAll: () => void;
  isLoading?: boolean;
}

export function ExcluirRecorrenteConfirmDialog({
  open,
  onOpenChange,
  transactionDescription,
  onDeleteSingle,
  onDeleteAll,
  isLoading = false
}: ExcluirRecorrenteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir transação recorrente</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Esta é uma transação recorrente{transactionDescription ? `: "${transactionDescription}"` : ''}.
            </p>
            <p>Como você deseja excluir?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="outline"
            className="justify-start gap-3 h-auto p-4 border-destructive/30 hover:bg-destructive/5"
            onClick={onDeleteSingle}
            disabled={isLoading}
          >
            <Calendar className="h-5 w-5 text-destructive" />
            <div className="text-left">
              <p className="font-medium">Apenas esta</p>
              <p className="text-xs text-muted-foreground">Exclui somente esta ocorrência</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-3 h-auto p-4 border-destructive/30 hover:bg-destructive/5"
            onClick={onDeleteAll}
            disabled={isLoading}
          >
            <Trash2 className="h-5 w-5 text-destructive" />
            <div className="text-left">
              <p className="font-medium">Esta e todas as futuras</p>
              <p className="text-xs text-muted-foreground">Exclui esta e todas as ocorrências futuras</p>
            </div>
            {isLoading && <Loader2 className="h-4 w-4 animate-spin ml-auto" />}
          </Button>
        </div>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
