import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Repeat, CalendarDays, AlertCircle } from 'lucide-react';

interface TornarRecorrenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: {
    id: string;
    description: string;
    amount: number;
    due_date: string;
    tipo: 'PAGAR' | 'RECEBER';
    entity_id: string;
    category_id?: string | null;
    subcategory_id?: string | null;
    account_id?: string | null;
    status: string;
    notes?: string | null;
  } | null;
  onConfirm: (transactions: any[]) => void;
  isLoading?: boolean;
}

export function TornarRecorrenteDialog({
  open,
  onOpenChange,
  transaction,
  onConfirm,
  isLoading
}: TornarRecorrenteDialogProps) {
  const [dayOfMonth, setDayOfMonth] = useState('10');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (open && transaction) {
      const date = new Date(transaction.due_date);
      setDayOfMonth(String(date.getDate()));
      // Default to end of year
      setEndDate('');
    }
  }, [open, transaction]);

  if (!transaction) return null;

  // Calculate how many transactions will be generated
  const getRecurringCount = () => {
    const startDate = new Date(transaction.due_date);
    const finalDate = endDate 
      ? new Date(endDate) 
      : new Date(startDate.getFullYear(), 11, 31);
    
    let count = 0;
    let current = new Date(startDate.getFullYear(), startDate.getMonth() + 1, parseInt(dayOfMonth) || startDate.getDate());
    
    while (current <= finalDate) {
      count++;
      current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
    }
    return count;
  };

  const generateFutureTransactions = () => {
    const transactions: any[] = [];
    const startDate = new Date(transaction.due_date);
    const day = parseInt(dayOfMonth) || startDate.getDate();
    const finalDate = endDate 
      ? new Date(endDate) 
      : new Date(startDate.getFullYear(), 11, 31);

    // Start from next month
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, day);

    while (currentDate <= finalDate) {
      // Handle months with fewer days
      const actualDay = Math.min(day, new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate());
      currentDate.setDate(actualDay);

      const refMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;

      transactions.push({
        entity_id: transaction.entity_id,
        tipo: transaction.tipo,
        description: transaction.description,
        amount: transaction.amount,
        due_date: currentDate.toISOString().split('T')[0],
        payment_date: null,
        status: 'PREVISTO',
        category_id: transaction.category_id || null,
        subcategory_id: transaction.subcategory_id || null,
        account_id: transaction.account_id || null,
        notes: transaction.notes || null,
        reference_month: refMonth,
        origin: 'RECORRENTE'
      });

      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, day);
    }

    return transactions;
  };

  const handleConfirm = () => {
    const futureTransactions = generateFutureTransactions();
    if (futureTransactions.length > 0) {
      onConfirm(futureTransactions);
    }
  };

  const recurringCount = getRecurringCount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            Tornar Recorrente
          </DialogTitle>
          <DialogDescription>
            Criar transações futuras baseadas nesta despesa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Transaction info */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <p className="font-medium">{transaction.description || 'Sem descrição'}</p>
            <p className="text-sm text-muted-foreground">
              R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} • 
              Vence dia {new Date(transaction.due_date).getDate()}
            </p>
          </div>

          {/* Day of month */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1">
              <CalendarDays className="h-3 w-3" />
              Dia do Vencimento
            </Label>
            <Input
              type="number"
              min="1"
              max="31"
              value={dayOfMonth}
              onChange={(e) => setDayOfMonth(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              As próximas transações serão criadas sempre neste dia
            </p>
          </div>

          {/* End date */}
          <div className="space-y-2">
            <Label>Repetir até (opcional)</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={transaction.due_date}
            />
            <p className="text-xs text-muted-foreground">
              Se não informado, será até dezembro deste ano
            </p>
          </div>

          {/* Preview */}
          {recurringCount > 0 ? (
            <div className="bg-primary/10 rounded-md p-3 text-sm">
              <span className="font-medium text-primary">{recurringCount}</span>
              <span className="text-muted-foreground"> transações serão criadas a partir do próximo mês</span>
            </div>
          ) : (
            <div className="bg-amber-500/10 rounded-md p-3 text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-amber-700">Nenhuma transação futura será criada com esta configuração</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={isLoading || recurringCount === 0}
            >
              {isLoading ? 'Criando...' : `Criar ${recurringCount} transações`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
