import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface NovaFaturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cartoes: any[];
  onSave: (invoice: any) => void;
  isLoading?: boolean;
}

export function NovaFaturaDialog({ 
  open, 
  onOpenChange, 
  cartoes,
  onSave,
  isLoading = false
}: NovaFaturaDialogProps) {
  const [formData, setFormData] = useState({
    credit_card_id: '',
    competencia: new Date().toISOString().slice(0, 7) + '-01',
    closing_date: '',
    due_date: '',
    total_value: '',
    status: 'ABERTA' as const
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        credit_card_id: '',
        competencia: new Date().toISOString().slice(0, 7) + '-01',
        closing_date: '',
        due_date: '',
        total_value: '',
        status: 'ABERTA'
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const invoice = {
      credit_card_id: formData.credit_card_id,
      competencia: formData.competencia,
      closing_date: formData.closing_date || null,
      due_date: formData.due_date || null,
      total_value: parseFloat(formData.total_value),
      status: formData.status
    };

    onSave(invoice);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Fatura</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="competencia">Competência *</Label>
            <Input
              id="competencia"
              type="month"
              value={formData.competencia.slice(0, 7)}
              onChange={(e) => setFormData({ ...formData, competencia: e.target.value + '-01' })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="closing_date">Data de Fechamento</Label>
              <Input
                id="closing_date"
                type="date"
                value={formData.closing_date}
                onChange={(e) => setFormData({ ...formData, closing_date: e.target.value })}
              />
            </div>

            <div>
              <Label htmlFor="due_date">Data de Vencimento</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="total_value">Valor Total *</Label>
            <Input
              id="total_value"
              type="number"
              step="0.01"
              value={formData.total_value}
              onChange={(e) => setFormData({ ...formData, total_value: e.target.value })}
              placeholder="0,00"
              required
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(v: any) => setFormData({ ...formData, status: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ABERTA">Aberta</SelectItem>
                <SelectItem value="FECHADA">Fechada</SelectItem>
                <SelectItem value="PAGA">Paga</SelectItem>
              </SelectContent>
            </Select>
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
