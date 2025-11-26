import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { Loader2, Beer } from 'lucide-react';
import { useAshbyMutations } from '@/hooks/useAshbyMutations';
import { toast } from 'sonner';

interface VincularAshbyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedido: any;
}

export function VincularAshbyDialog({ open, onOpenChange, pedido }: VincularAshbyDialogProps) {
  const { createPedido, isCreating } = useAshbyMutations();
  const [formData, setFormData] = useState({
    liters: '',
    value_sem_nf: '',
    value_com_nf: '',
    freight: '',
    notes: '',
    status: 'PREVISTO' as 'PREVISTO' | 'FATURADO' | 'PAGO' | 'CANCELADO'
  });

  useEffect(() => {
    if (open && pedido) {
      // Pré-preencher com dados do pedido
      setFormData({
        liters: '',
        value_sem_nf: pedido.valor_total?.toString() || '',
        value_com_nf: '',
        freight: '',
        notes: `Pedido #${pedido.numero_pedido}`,
        status: pedido.status === 'pago' ? 'PAGO' : 'PREVISTO'
      });
    }
  }, [open, pedido]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const orderDate = new Date(pedido.data_pedido);
    const year = orderDate.getFullYear();
    const month = orderDate.getMonth() + 1;
    const quarter = Math.ceil(month / 3);

    const valueSemNf = parseFloat(formData.value_sem_nf) || 0;
    const valueComNf = parseFloat(formData.value_com_nf) || 0;
    const freight = parseFloat(formData.freight) || 0;
    const total = valueSemNf + valueComNf + freight;

    const order = {
      order_date: pedido.data_pedido,
      due_date: pedido.data_entrega || null,
      year,
      quarter,
      month,
      liters: parseFloat(formData.liters) || null,
      value_sem_nf: valueSemNf || null,
      value_com_nf: valueComNf || null,
      freight: freight || null,
      total,
      status: formData.status,
      notes: formData.notes || null
    };

    createPedido(order);
    toast.success('Pedido vinculado ao Ashby com sucesso!');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Beer className="h-5 w-5" />
            Vincular ao Ashby
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-muted p-3 rounded-md">
            <p className="text-sm">
              <strong>Pedido:</strong> #{pedido?.numero_pedido}
            </p>
            <p className="text-sm">
              <strong>Data:</strong> {pedido?.data_pedido ? new Date(pedido.data_pedido).toLocaleDateString('pt-BR') : '-'}
            </p>
            <p className="text-sm">
              <strong>Valor Original:</strong> R$ {pedido?.valor_total?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="liters">Litros</Label>
              <Input
                id="liters"
                type="number"
                step="0.01"
                value={formData.liters}
                onChange={(e) => setFormData({ ...formData, liters: e.target.value })}
                placeholder="0,00"
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
                  <SelectItem value="FATURADO">Faturado</SelectItem>
                  <SelectItem value="PAGO">Pago</SelectItem>
                  <SelectItem value="CANCELADO">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="value_sem_nf">Valor sem NF</Label>
              <Input
                id="value_sem_nf"
                type="number"
                step="0.01"
                value={formData.value_sem_nf}
                onChange={(e) => setFormData({ ...formData, value_sem_nf: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label htmlFor="value_com_nf">Valor com NF</Label>
              <Input
                id="value_com_nf"
                type="number"
                step="0.01"
                value={formData.value_com_nf}
                onChange={(e) => setFormData({ ...formData, value_com_nf: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label htmlFor="freight">Frete</Label>
              <Input
                id="freight"
                type="number"
                step="0.01"
                value={formData.freight}
                onChange={(e) => setFormData({ ...formData, freight: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label>Total</Label>
              <Input
                value={(
                  (parseFloat(formData.value_sem_nf) || 0) +
                  (parseFloat(formData.value_com_nf) || 0) +
                  (parseFloat(formData.freight) || 0)
                ).toFixed(2)}
                disabled
                className="bg-muted"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observações sobre o pedido..."
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isCreating}>
              {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Vincular ao Ashby
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
