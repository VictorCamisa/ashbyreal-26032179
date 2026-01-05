import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, CreditCard, Pencil } from 'lucide-react';

interface EditarCartaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartao: any;
  onSave: (updates: any) => void;
  isLoading?: boolean;
}

export function EditarCartaoDialog({
  open,
  onOpenChange,
  cartao,
  onSave,
  isLoading = false,
}: EditarCartaoDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    limit_value: '',
    closing_day: '',
    due_day: '',
    is_active: true,
  });

  useEffect(() => {
    if (cartao && open) {
      setFormData({
        name: cartao.name || '',
        limit_value: cartao.limit_value?.toString() || '',
        closing_day: cartao.closing_day?.toString() || '',
        due_day: cartao.due_day?.toString() || '',
        is_active: cartao.is_active !== false,
      });
    }
  }, [cartao, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      id: cartao.id,
      name: formData.name,
      limit_value: formData.limit_value ? parseFloat(formData.limit_value) : null,
      closing_day: formData.closing_day ? parseInt(formData.closing_day) : null,
      due_day: formData.due_day ? parseInt(formData.due_day) : null,
      is_active: formData.is_active,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Editar Cartão
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Cartão</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Ex: Itaú Platinum"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="limit_value">Limite de Crédito</Label>
            <Input
              id="limit_value"
              type="number"
              step="0.01"
              value={formData.limit_value}
              onChange={(e) =>
                setFormData({ ...formData, limit_value: e.target.value })
              }
              placeholder="0,00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="closing_day">Dia de Fechamento</Label>
              <Input
                id="closing_day"
                type="number"
                min="1"
                max="31"
                value={formData.closing_day}
                onChange={(e) =>
                  setFormData({ ...formData, closing_day: e.target.value })
                }
                placeholder="10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_day">Dia de Vencimento</Label>
              <Input
                id="due_day"
                type="number"
                min="1"
                max="31"
                value={formData.due_day}
                onChange={(e) =>
                  setFormData({ ...formData, due_day: e.target.value })
                }
                placeholder="20"
              />
            </div>
          </div>

          <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="is_active" className="text-sm font-medium">
                Cartão Ativo
              </Label>
              <p className="text-xs text-muted-foreground">
                Cartões inativos não aparecem nas listagens
              </p>
            </div>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, is_active: checked })
              }
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
