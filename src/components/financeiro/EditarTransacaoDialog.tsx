import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { useCategorias, useSubcategorias } from '@/hooks/useCategorias';
import { useAccounts } from '@/hooks/useAccounts';
import { useEntities } from '@/hooks/useEntities';
import { Loader2, Building2, User } from 'lucide-react';

interface EditarTransacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: any;
  onSave: (transaction: any) => void;
  isLoading?: boolean;
}

export function EditarTransacaoDialog({ 
  open, 
  onOpenChange, 
  transaction,
  onSave,
  isLoading = false
}: EditarTransacaoDialogProps) {
  const [formData, setFormData] = useState({
    entity_id: '',
    description: '',
    amount: '',
    due_date: '',
    payment_date: '',
    status: 'PREVISTO' as const,
    category_id: '',
    subcategory_id: '',
    account_id: '',
    notes: '',
    reference_month: ''
  });

  const { data: entities } = useEntities();
  const tipo = transaction?.tipo === 'PAGAR' ? 'DESPESA' : 'RECEITA';
  const { data: categories } = useCategorias(tipo);
  const { data: subcategories } = useSubcategorias(formData.category_id);
  const { data: accounts } = useAccounts(formData.entity_id);

  useEffect(() => {
    if (transaction && open) {
      setFormData({
        entity_id: transaction.entity_id || '',
        description: transaction.description || '',
        amount: transaction.amount?.toString() || '',
        due_date: transaction.due_date || '',
        payment_date: transaction.payment_date || '',
        status: transaction.status || 'PREVISTO',
        category_id: transaction.category_id || '',
        subcategory_id: transaction.subcategory_id || '',
        account_id: transaction.account_id || '',
        notes: transaction.notes || '',
        reference_month: transaction.reference_month?.slice(0, 7) || ''
      });
    }
  }, [transaction, open]);

  // Reset account when entity changes
  const handleEntityChange = (entityId: string) => {
    setFormData(prev => ({ ...prev, entity_id: entityId, account_id: '' }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const updates = {
      id: transaction.id,
      entity_id: formData.entity_id,
      description: formData.description,
      amount: parseFloat(formData.amount),
      due_date: formData.due_date,
      payment_date: formData.payment_date || null,
      status: formData.status,
      category_id: formData.category_id || null,
      subcategory_id: formData.subcategory_id || null,
      account_id: formData.account_id || null,
      notes: formData.notes || null,
      reference_month: formData.reference_month ? formData.reference_month + '-01' : null
    };

    onSave(updates);
  };

  const selectedEntity = entities?.find(e => e.id === formData.entity_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Transação</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Entidade */}
            <div className="col-span-2">
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

            <div className="col-span-2">
              <Label htmlFor="description">Descrição *</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da transação"
                required
              />
            </div>

            <div>
              <Label htmlFor="amount">Valor *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0,00"
                required
              />
            </div>

            <div>
              <Label htmlFor="due_date">Data de Vencimento *</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="status">Status</Label>
              <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PREVISTO">Previsto</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="ATRASADO">Atrasado</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="payment_date">Data de Pagamento</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="category">Categoria</Label>
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

            <div>
              <Label htmlFor="subcategory">Subcategoria</Label>
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

            <div>
              <Label htmlFor="account">Conta</Label>
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

            <div>
              <Label htmlFor="reference_month">Mês de Referência</Label>
              <Input
                id="reference_month"
                type="month"
                value={formData.reference_month}
                onChange={(e) => setFormData({ ...formData, reference_month: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações adicionais..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !formData.entity_id}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
