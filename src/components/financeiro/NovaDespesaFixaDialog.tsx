import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Switch } from '@/components/ui/switch';
import { useCategorias } from '@/hooks/useCategorias';
import { useAccounts } from '@/hooks/useAccounts';
import { useEntities } from '@/hooks/useEntities';
import { RecurringExpense } from '@/hooks/useRecurringExpenses';
import { Repeat, CalendarDays } from 'lucide-react';

interface NovaDespesaFixaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (expense: Omit<RecurringExpense, 'id' | 'created_at' | 'updated_at' | 'categories' | 'subcategories' | 'accounts' | 'entities'>) => void;
  isLoading?: boolean;
  editingExpense?: RecurringExpense | null;
}

export function NovaDespesaFixaDialog({
  open,
  onOpenChange,
  onSave,
  isLoading,
  editingExpense
}: NovaDespesaFixaDialogProps) {
  const { data: categorias = [] } = useCategorias();
  const { data: allSubcategorias = [] } = useQuery({
    queryKey: ['all-subcategories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('subcategories').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });
  const { data: accounts = [] } = useAccounts();
  const { data: entities = [] } = useEntities();

  const [formData, setFormData] = useState({
    entity_id: '',
    description: '',
    amount: '',
    category_id: '',
    subcategory_id: '',
    account_id: '',
    frequency: 'MENSAL',
    day_of_month: '10',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_active: true,
    notes: ''
  });

  useEffect(() => {
    if (editingExpense) {
      setFormData({
        entity_id: editingExpense.entity_id || '',
        description: editingExpense.description,
        amount: String(editingExpense.amount),
        category_id: editingExpense.category_id || '',
        subcategory_id: editingExpense.subcategory_id || '',
        account_id: editingExpense.account_id || '',
        frequency: editingExpense.frequency,
        day_of_month: String(editingExpense.day_of_month || 10),
        start_date: editingExpense.start_date,
        end_date: editingExpense.end_date || '',
        is_active: editingExpense.is_active,
        notes: editingExpense.notes || ''
      });
    } else {
      setFormData({
        entity_id: '',
        description: '',
        amount: '',
        category_id: '',
        subcategory_id: '',
        account_id: '',
        frequency: 'MENSAL',
        day_of_month: '10',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_active: true,
        notes: ''
      });
    }
  }, [editingExpense, open]);

  const despesaCategorias = categorias.filter(c => c.type === 'DESPESA');
  const filteredSubcategorias = allSubcategorias.filter(s => s.category_id === formData.category_id);

  const handleSubmit = () => {
    if (!formData.description || !formData.amount || !formData.start_date) {
      return;
    }

    onSave({
      entity_id: formData.entity_id || null,
      description: formData.description,
      amount: parseFloat(formData.amount),
      category_id: formData.category_id || null,
      subcategory_id: formData.subcategory_id || null,
      account_id: formData.account_id || null,
      frequency: formData.frequency,
      day_of_month: parseInt(formData.day_of_month) || 10,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
      is_active: formData.is_active,
      notes: formData.notes || null
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-primary" />
            {editingExpense ? 'Editar Despesa Fixa' : 'Nova Despesa Fixa'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Entity */}
          <div className="space-y-2">
            <Label>Entidade</Label>
            <Select
              value={formData.entity_id}
              onValueChange={(v) => setFormData({ ...formData, entity_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione a entidade" />
              </SelectTrigger>
              <SelectContent>
                {entities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Descrição *</Label>
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Ex: Aluguel, Internet, Energia..."
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label>Valor *</Label>
            <Input
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              placeholder="0,00"
            />
          </div>

          {/* Category & Subcategory */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select
                value={formData.category_id}
                onValueChange={(v) => setFormData({ ...formData, category_id: v, subcategory_id: '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {despesaCategorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Subcategoria</Label>
              <Select
                value={formData.subcategory_id}
                onValueChange={(v) => setFormData({ ...formData, subcategory_id: v })}
                disabled={!formData.category_id}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {filteredSubcategorias.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <Label>Conta de Pagamento</Label>
            <Select
              value={formData.account_id}
              onValueChange={(v) => setFormData({ ...formData, account_id: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Frequency & Day */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={formData.frequency}
                onValueChange={(v) => setFormData({ ...formData, frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MENSAL">Mensal</SelectItem>
                  <SelectItem value="SEMANAL">Semanal</SelectItem>
                  <SelectItem value="ANUAL">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                Dia do Vencimento
              </Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={formData.day_of_month}
                onChange={(e) => setFormData({ ...formData, day_of_month: e.target.value })}
              />
            </div>
          </div>

          {/* Start & End Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data Início *</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Data Fim (opcional)</Label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center justify-between">
            <Label>Ativa</Label>
            <Switch
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Notas adicionais..."
              rows={2}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !formData.description || !formData.amount}
            >
              {isLoading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
