import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Calendar, CalendarClock, Loader2 } from 'lucide-react';

interface EditarRecorrenteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transactionDescription?: string;
  onEditSingle: () => void;
  onEditFuture: () => void;
  isLoading?: boolean;
}

export function EditarRecorrenteConfirmDialog({
  open,
  onOpenChange,
  transactionDescription,
  onEditSingle,
  onEditFuture,
  isLoading = false
}: EditarRecorrenteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Editar transação recorrente</AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Esta é uma transação recorrente{transactionDescription ? `: "${transactionDescription}"` : ''}.
            </p>
            <p>Como você deseja aplicar as alterações?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-4">
          <Button
            variant="outline"
            className="justify-start gap-3 h-auto p-4"
            onClick={onEditSingle}
            disabled={isLoading}
          >
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">Apenas esta</p>
              <p className="text-xs text-muted-foreground">Altera somente esta ocorrência</p>
            </div>
          </Button>
          <Button
            variant="outline"
            className="justify-start gap-3 h-auto p-4"
            onClick={onEditFuture}
            disabled={isLoading}
          >
            <CalendarClock className="h-5 w-5 text-muted-foreground" />
            <div className="text-left">
              <p className="font-medium">Esta e as futuras</p>
              <p className="text-xs text-muted-foreground">Altera esta e todas as ocorrências futuras</p>
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
