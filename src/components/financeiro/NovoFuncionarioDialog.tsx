import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface NovoFuncionarioDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (employee: any) => void;
  isLoading?: boolean;
}

export function NovoFuncionarioDialog({ 
  open, 
  onOpenChange, 
  onSave,
  isLoading = false
}: NovoFuncionarioDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    monthly_salary: '',
    hourly_cost: ''
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        name: '',
        role: '',
        monthly_salary: '',
        hourly_cost: ''
      });
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const employee = {
      name: formData.name,
      role: formData.role || null,
      monthly_salary: formData.monthly_salary ? parseFloat(formData.monthly_salary) : null,
      hourly_cost: formData.hourly_cost ? parseFloat(formData.hourly_cost) : null,
      is_active: true
    };

    onSave(employee);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Funcionário</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Nome do funcionário"
              required
            />
          </div>

          <div>
            <Label htmlFor="role">Cargo</Label>
            <Input
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder="Ex: Vendedor, Gerente"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="monthly_salary">Salário Mensal</Label>
              <Input
                id="monthly_salary"
                type="number"
                step="0.01"
                value={formData.monthly_salary}
                onChange={(e) => setFormData({ ...formData, monthly_salary: e.target.value })}
                placeholder="0,00"
              />
            </div>

            <div>
              <Label htmlFor="hourly_cost">Custo por Hora</Label>
              <Input
                id="hourly_cost"
                type="number"
                step="0.01"
                value={formData.hourly_cost}
                onChange={(e) => setFormData({ ...formData, hourly_cost: e.target.value })}
                placeholder="0,00"
              />
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
