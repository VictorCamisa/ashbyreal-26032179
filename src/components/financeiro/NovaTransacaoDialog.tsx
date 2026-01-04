import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useState, useEffect } from 'react';
import { useCategorias, useSubcategorias } from '@/hooks/useCategorias';
import { useAccounts } from '@/hooks/useAccounts';
import { useEntities } from '@/hooks/useEntities';
import { Loader2, Building2, User, Repeat, CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NovaTransacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: 'PAGAR' | 'RECEBER';
  onSave: (transaction: any) => void;
  onSaveMultiple?: (transactions: any[]) => void;
  isLoading?: boolean;
  defaultEntityId?: string;
}

export function NovaTransacaoDialog({ 
  open, 
  onOpenChange, 
  tipo,
  onSave,
  onSaveMultiple,
  isLoading = false,
  defaultEntityId
}: NovaTransacaoDialogProps) {
  const [formData, setFormData] = useState({
    entity_id: '',
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    reference_month: new Date().toISOString().slice(0, 7) + '-01',
    description: '',
    account_id: '',
    category_id: '',
    subcategory_id: '',
    notes: '',
    status: 'PREVISTO' as const,
    // Recurrence fields
    is_recurring: false,
    end_date: '',
    day_of_month: new Date().getDate().toString()
  });

  const { data: entities } = useEntities();
  const { data: categories } = useCategorias(tipo === 'PAGAR' ? 'DESPESA' : 'RECEITA');
  const { data: subcategories } = useSubcategorias(formData.category_id);
  const { data: accounts } = useAccounts(formData.entity_id);

  // Set default entity when dialog opens
  useEffect(() => {
    if (open && entities && entities.length > 0) {
      const defaultEntity = defaultEntityId 
        ? entities.find(e => e.id === defaultEntityId)
        : entities.find(e => e.type === 'LOJA') || entities[0];
      
      if (defaultEntity && !formData.entity_id) {
        setFormData(prev => ({ ...prev, entity_id: defaultEntity.id, account_id: '' }));
      }
    }
  }, [open, entities, defaultEntityId]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setFormData({
        entity_id: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        reference_month: new Date().toISOString().slice(0, 7) + '-01',
        description: '',
        account_id: '',
        category_id: '',
        subcategory_id: '',
        notes: '',
        status: 'PREVISTO',
        is_recurring: false,
        end_date: '',
        day_of_month: new Date().getDate().toString()
      });
    }
  }, [open]);

  // Reset account when entity changes
  const handleEntityChange = (entityId: string) => {
    setFormData(prev => ({ ...prev, entity_id: entityId, account_id: '' }));
  };

  // Generate future transactions based on recurrence settings
  const generateRecurringTransactions = (baseTransaction: any) => {
    const transactions: any[] = [];
    const startDate = new Date(formData.due_date);
    const endDate = formData.end_date ? new Date(formData.end_date) : null;
    const dayOfMonth = parseInt(formData.day_of_month) || startDate.getDate();
    
    // If no end date, generate until December of current year
    const finalDate = endDate || new Date(startDate.getFullYear(), 11, 31);
    
    let currentDate = new Date(startDate.getFullYear(), startDate.getMonth(), dayOfMonth);
    
    // If we're past this month's day, start from the given date
    if (currentDate < startDate) {
      currentDate = startDate;
    }
    
    while (currentDate <= finalDate) {
      const refMonth = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-01`;
      
      transactions.push({
        ...baseTransaction,
        due_date: currentDate.toISOString().split('T')[0],
        reference_month: refMonth,
        origin: 'RECORRENTE' as const
      });
      
      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, dayOfMonth);
      
      // Handle months with fewer days
      if (currentDate.getDate() !== dayOfMonth) {
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0); // Last day of previous month
      }
    }
    
    return transactions;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) return;
    if (!formData.entity_id) return;

    const baseTransaction = {
      entity_id: formData.entity_id,
      tipo,
      description: formData.description,
      amount,
      due_date: formData.due_date,
      payment_date: null,
      status: formData.status,
      category_id: formData.category_id || null,
      subcategory_id: formData.subcategory_id || null,
      account_id: formData.account_id || null,
      notes: formData.notes || null,
      reference_month: formData.reference_month,
      origin: 'MANUAL' as const
    };

    if (formData.is_recurring && onSaveMultiple) {
      const transactions = generateRecurringTransactions(baseTransaction);
      onSaveMultiple(transactions);
    } else {
      onSave(baseTransaction);
    }
  };

  const isReceita = tipo === 'RECEBER';
  const selectedEntity = entities?.find(e => e.id === formData.entity_id);

  // Calculate how many transactions will be generated
  const getRecurringCount = () => {
    if (!formData.is_recurring || !formData.due_date) return 0;
    const startDate = new Date(formData.due_date);
    const endDate = formData.end_date ? new Date(formData.end_date) : new Date(startDate.getFullYear(), 11, 31);
    
    let count = 0;
    let current = new Date(startDate);
    while (current <= endDate) {
      count++;
      current = new Date(current.getFullYear(), current.getMonth() + 1, current.getDate());
    }
    return count;
  };

  const recurringCount = getRecurringCount();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={cn(
              "h-3 w-3 rounded-full",
              isReceita ? "bg-emerald-500" : "bg-amber-500"
            )} />
            Nova {isReceita ? 'Receita' : 'Despesa'}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Entidade */}
          <div className="space-y-2">
            <Label>Entidade *</Label>
            <Select value={formData.entity_id} onValueChange={handleEntityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a entidade..." />
              </SelectTrigger>
              <SelectContent>
                {entities?.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    <div className="flex items-center gap-2">
                      {entity.type === 'LOJA' ? (
                        <Building2 className="h-4 w-4 text-blue-500" />
                      ) : (
                        <User className="h-4 w-4 text-purple-500" />
                      )}
                      {entity.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Valor *</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descrição da transação"
            />
          </div>

          {/* Categoria e Conta */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(v) => setFormData({ ...formData, category_id: v, subcategory_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Conta</Label>
              <Select 
                value={formData.account_id} 
                onValueChange={(v) => setFormData({ ...formData, account_id: v })}
                disabled={!formData.entity_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder={formData.entity_id ? "Selecione..." : "Selecione entidade primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Subcategoria e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select 
                value={formData.subcategory_id} 
                onValueChange={(v) => setFormData({ ...formData, subcategory_id: v })}
                disabled={!formData.category_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {subcategories?.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREVISTO">Pendente</SelectItem>
                  <SelectItem value="PAGO">{isReceita ? 'Recebido' : 'Pago'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recorrência */}
          <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat className="h-4 w-4 text-primary" />
                <Label className="font-medium">É recorrente?</Label>
              </div>
              <Switch
                checked={formData.is_recurring}
                onCheckedChange={(checked) => setFormData({ ...formData, is_recurring: checked })}
              />
            </div>

            {formData.is_recurring && (
              <div className="space-y-4 pt-2 animate-in fade-in-50">
                <p className="text-sm text-muted-foreground">
                  Ao marcar como recorrente, serão criadas transações automaticamente para os próximos meses.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1">
                      <CalendarDays className="h-3 w-3" />
                      Dia do Vencimento
                    </Label>
                    <Input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.day_of_month}
                      onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Data Final (opcional)</Label>
                    <Input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      min={formData.due_date}
                    />
                  </div>
                </div>

                {recurringCount > 0 && (
                  <div className="bg-primary/10 rounded-md p-3 text-sm">
                    <span className="font-medium text-primary">{recurringCount}</span>
                    <span className="text-muted-foreground"> transações serão criadas</span>
                    {!formData.end_date && (
                      <span className="text-muted-foreground"> (até dezembro)</span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Observações..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading || !formData.amount || !formData.entity_id || (formData.is_recurring && !onSaveMultiple)}
              className={cn(
                isReceita && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {formData.is_recurring ? `Criar ${recurringCount} transações` : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
