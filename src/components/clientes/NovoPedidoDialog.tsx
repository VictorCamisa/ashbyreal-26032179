import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ShoppingCart } from 'lucide-react';

interface NovoPedidoDialogProps {
  clienteId: string;
  onSuccess?: () => void;
}

export function NovoPedidoDialog({ clienteId, onSuccess }: NovoPedidoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    numero_pedido: '',
    status: 'pendente',
    valor_total: '',
    data_pedido: new Date().toISOString().split('T')[0],
    data_entrega: '',
    observacoes: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await supabase.from('pedidos').insert({
        cliente_id: clienteId,
        numero_pedido: formData.numero_pedido,
        status: formData.status,
        valor_total: parseFloat(formData.valor_total),
        data_pedido: new Date(formData.data_pedido).toISOString(),
        data_entrega: formData.data_entrega ? new Date(formData.data_entrega).toISOString() : null,
        observacoes: formData.observacoes || null
      });

      if (error) throw error;

      toast({
        title: 'Pedido criado',
        description: 'O pedido foi criado com sucesso.'
      });

      setOpen(false);
      setFormData({
        numero_pedido: '',
        status: 'pendente',
        valor_total: '',
        data_pedido: new Date().toISOString().split('T')[0],
        data_entrega: '',
        observacoes: ''
      });
      
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o pedido.',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <ShoppingCart className="h-4 w-4 mr-2" />
          Novo Pedido
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Novo Pedido</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="numero_pedido">Número do Pedido</Label>
            <Input
              id="numero_pedido"
              value={formData.numero_pedido}
              onChange={(e) => setFormData({ ...formData, numero_pedido: e.target.value })}
              placeholder="Ex: PED-2025-001"
              required
            />
          </div>

          <div>
            <Label htmlFor="valor_total">Valor Total (R$)</Label>
            <Input
              id="valor_total"
              type="number"
              step="0.01"
              value={formData.valor_total}
              onChange={(e) => setFormData({ ...formData, valor_total: e.target.value })}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="confirmado">Confirmado</SelectItem>
                <SelectItem value="em_separacao">Em Separação</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="entregue">Entregue</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="data_pedido">Data do Pedido</Label>
              <Input
                id="data_pedido"
                type="date"
                value={formData.data_pedido}
                onChange={(e) => setFormData({ ...formData, data_pedido: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="data_entrega">Data de Entrega</Label>
              <Input
                id="data_entrega"
                type="date"
                value={formData.data_entrega}
                onChange={(e) => setFormData({ ...formData, data_entrega: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              placeholder="Observações sobre o pedido..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Criando...' : 'Criar Pedido'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
