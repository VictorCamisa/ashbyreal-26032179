import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { useHorasExtras } from '@/hooks/useHorasExtras';
import { Loader2 } from 'lucide-react';

interface LancarPontoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (entry: any) => void;
  isLoading?: boolean;
  referenceMonth: string;
}

export function LancarPontoDialog({ open, onOpenChange, onSave, isLoading, referenceMonth }: LancarPontoDialogProps) {
  const { funcionarios } = useHorasExtras(referenceMonth);
  const [formData, setFormData] = useState({
    employee_id: '',
    date: new Date().toISOString().split('T')[0],
    hours: '',
    tipo: 'NORMAL' as const,
    observation: ''
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        employee_id: '',
        date: new Date().toISOString().split('T')[0],
        hours: '',
        tipo: 'NORMAL',
        observation: ''
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const entry = {
      employee_id: formData.employee_id,
      date: formData.date,
      hours: parseFloat(formData.hours),
      tipo: formData.tipo,
      observation: formData.observation || null
    };

    onSave(entry);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Lançar Ponto</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="employee">Funcionário *</Label>
            <Select 
              value={formData.employee_id} 
              onValueChange={(v) => setFormData({ ...formData, employee_id: v })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                {funcionarios?.map((func) => (
                  <SelectItem key={func.id} value={func.id}>
                    {func.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Data *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="tipo">Tipo *</Label>
            <Select value={formData.tipo} onValueChange={(v: any) => setFormData({ ...formData, tipo: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NORMAL">Normal</SelectItem>
                <SelectItem value="EXTRA">Hora Extra</SelectItem>
                <SelectItem value="FALTA">Falta</SelectItem>
                <SelectItem value="FERIADO">Feriado</SelectItem>
                <SelectItem value="OUTRO">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="hours">Horas *</Label>
            <Input
              id="hours"
              type="number"
              step="0.5"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              placeholder="Ex: 8.0"
              required
            />
          </div>

          <div>
            <Label htmlFor="observation">Observação</Label>
            <Textarea
              id="observation"
              value={formData.observation}
              onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
              placeholder="Observações adicionais..."
              rows={3}
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
