import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { useCategorias } from '@/hooks/useCategorias';
import { useEntities } from '@/hooks/useEntities';
import { Loader2 } from 'lucide-react';

interface NovoGastoCartaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartoes: any[];
  onSave: (transaction: any) => void;
  isLoading?: boolean;
}

export function NovoGastoCartaoDialog({ 
  open, 
  onOpenChange, 
  cartoes,
  onSave,
  isLoading = false
}: NovoGastoCartaoDialogProps) {
  const [formData, setFormData] = useState({
    credit_card_id: '',
    entity_id: '',
    description: '',
    amount: '',
    purchase_date: new Date().toISOString().split('T')[0],
    total_installments: '1',
    installment_number: '1',
    category_id: ''
  });

  const { data: categories } = useCategorias('DESPESA');
  const { data: entities } = useEntities();

  useEffect(() => {
    if (!open) {
      setFormData({
        credit_card_id: '',
        entity_id: '',
        description: '',
        amount: '',
        purchase_date: new Date().toISOString().split('T')[0],
        total_installments: '1',
        installment_number: '1',
        category_id: ''
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const transaction = {
      credit_card_id: formData.credit_card_id,
      entity_id: formData.entity_id || null,
      description: formData.description,
      amount: parseFloat(formData.amount),
      purchase_date: formData.purchase_date,
      total_installments: parseInt(formData.total_installments),
      installment_number: parseInt(formData.installment_number),
      category_id: formData.category_id || null
    };

    onSave(transaction);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Novo Gasto no Cartão</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="card">Cartão *</Label>
              <Select 
                value={formData.credit_card_id} 
                onValueChange={(v) => setFormData({ ...formData, credit_card_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o cartão" />
                </SelectTrigger>
                <SelectContent>
                  {cartoes?.map((cartao) => (
                    <SelectItem key={cartao.id} value={cartao.id}>
                      {cartao.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="entity">Entidade</Label>
              <Select 
                value={formData.entity_id} 
                onValueChange={(v) => setFormData({ ...formData, entity_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {entities?.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.name}
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
                placeholder="Descrição do gasto"
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
              <Label htmlFor="purchase_date">Data da Compra *</Label>
              <Input
                id="purchase_date"
                type="date"
                value={formData.purchase_date}
                onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="total_installments">Total de Parcelas</Label>
              <Input
                id="total_installments"
                type="number"
                min="1"
                value={formData.total_installments}
                onChange={(e) => setFormData({ ...formData, total_installments: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="installment_number">Número da Parcela</Label>
              <Input
                id="installment_number"
                type="number"
                min="1"
                value={formData.installment_number}
                onChange={(e) => setFormData({ ...formData, installment_number: e.target.value })}
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="category">Categoria</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(v) => setFormData({ ...formData, category_id: v })}
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
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
