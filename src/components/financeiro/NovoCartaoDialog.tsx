import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { useEntities } from '@/hooks/useEntities';
import { useAccounts } from '@/hooks/useAccounts';
import { Loader2 } from 'lucide-react';

interface NovoCartaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (card: any) => void;
  isLoading?: boolean;
}

export function NovoCartaoDialog({ open, onOpenChange, onSave, isLoading }: NovoCartaoDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    entity_id: '',
    account_liquidacao_id: '',
    closing_day: '',
    due_day: '',
    limit_value: '',
    is_active: true
  });

  const { data: entities } = useEntities();
  const { data: accounts } = useAccounts();

  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        entity_id: '',
        account_liquidacao_id: '',
        closing_day: '',
        due_day: '',
        limit_value: '',
        is_active: true
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const card = {
      name: formData.name,
      entity_id: formData.entity_id || null,
      account_liquidacao_id: formData.account_liquidacao_id || null,
      closing_day: formData.closing_day ? parseInt(formData.closing_day) : null,
      due_day: formData.due_day ? parseInt(formData.due_day) : null,
      limit_value: formData.limit_value ? parseFloat(formData.limit_value) : null,
      is_active: formData.is_active
    };

    onSave(card);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo Cartão de Crédito</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome do Cartão *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Nubank Corporativo"
              required
            />
          </div>

          <div>
            <Label htmlFor="entity">Entidade</Label>
            <Select value={formData.entity_id} onValueChange={(v) => setFormData({ ...formData, entity_id: v })}>
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

          <div>
            <Label htmlFor="account">Conta de Liquidação</Label>
            <Select value={formData.account_liquidacao_id} onValueChange={(v) => setFormData({ ...formData, account_liquidacao_id: v })}>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="closing_day">Dia do Fechamento</Label>
              <Input
                id="closing_day"
                type="number"
                min="1"
                max="31"
                value={formData.closing_day}
                onChange={(e) => setFormData({ ...formData, closing_day: e.target.value })}
                placeholder="Ex: 15"
              />
            </div>

            <div>
              <Label htmlFor="due_day">Dia do Vencimento</Label>
              <Input
                id="due_day"
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) => setFormData({ ...formData, due_day: e.target.value })}
                placeholder="Ex: 25"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="limit_value">Limite do Cartão</Label>
            <Input
              id="limit_value"
              type="number"
              step="0.01"
              value={formData.limit_value}
              onChange={(e) => setFormData({ ...formData, limit_value: e.target.value })}
              placeholder="0,00"
            />
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
