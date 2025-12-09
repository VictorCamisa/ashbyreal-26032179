import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { useCategorias, useSubcategorias } from '@/hooks/useCategorias';
import { useAccounts } from '@/hooks/useAccounts';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NovaTransacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  tipo: 'PAGAR' | 'RECEBER';
  onSave: (transaction: any) => void;
  isLoading?: boolean;
}

export function NovaTransacaoDialog({ 
  open, 
  onOpenChange, 
  entityId, 
  tipo,
  onSave,
  isLoading = false
}: NovaTransacaoDialogProps) {
  const [formData, setFormData] = useState({
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    reference_month: new Date().toISOString().slice(0, 7) + '-01',
    description: '',
    account_id: '',
    category_id: '',
    subcategory_id: '',
    notes: '',
    status: 'PREVISTO' as const
  });

  const { data: categories } = useCategorias(tipo === 'PAGAR' ? 'DESPESA' : 'RECEITA');
  const { data: subcategories } = useSubcategorias(formData.category_id);
  const { data: accounts } = useAccounts(entityId);

  useEffect(() => {
    if (!open) {
      setFormData({
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        reference_month: new Date().toISOString().slice(0, 7) + '-01',
        description: '',
        account_id: '',
        category_id: '',
        subcategory_id: '',
        notes: '',
        status: 'PREVISTO'
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) return;

    const transaction = {
      entity_id: entityId,
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

    onSave(transaction);
  };

  const isReceita = tipo === 'RECEBER';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
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
              <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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
              disabled={isLoading || !formData.amount}
              className={cn(
                isReceita && "bg-emerald-600 hover:bg-emerald-700"
              )}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
