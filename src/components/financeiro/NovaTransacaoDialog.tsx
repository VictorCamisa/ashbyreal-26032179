import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';
import { useCategorias, useSubcategorias } from '@/hooks/useCategorias';
import { useAccounts } from '@/hooks/useAccounts';
import { Loader2, Check, X, Paperclip, HelpCircle, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NovaTransacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityId: string;
  tipo: 'PAGAR' | 'RECEBER';
  onSave: (transaction: any) => void;
  isLoading?: boolean;
}

type RecurrenceType = 'UNICA' | 'PARCELADA' | 'FIXA';

export function NovaTransacaoDialog({ 
  open, 
  onOpenChange, 
  entityId, 
  tipo,
  onSave,
  isLoading = false
}: NovaTransacaoDialogProps) {
  const [formData, setFormData] = useState({
    amount: '',
    due_date: new Date().toISOString().split('T')[0],
    reference_month: new Date().toISOString().slice(0, 7) + '-01',
    recurrence_type: 'UNICA' as RecurrenceType,
    installments: '2',
    description: '',
    account_id: '',
    category_id: '',
    subcategory_id: '',
    notes: '',
    document_number: '',
    payment_method: '',
    status: 'PREVISTO' as const
  });

  const [showError, setShowError] = useState(false);

  const { data: categories } = useCategorias(tipo === 'PAGAR' ? 'DESPESA' : 'RECEITA');
  const { data: subcategories } = useSubcategorias(formData.category_id);
  const { data: accounts } = useAccounts(entityId);

  useEffect(() => {
    if (!open) {
      setFormData({
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        reference_month: new Date().toISOString().slice(0, 7) + '-01',
        recurrence_type: 'UNICA',
        installments: '2',
        description: '',
        account_id: '',
        category_id: '',
        subcategory_id: '',
        notes: '',
        document_number: '',
        payment_method: '',
        status: 'PREVISTO'
      });
      setShowError(false);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(formData.amount);
    if (!amount || amount <= 0) {
      setShowError(true);
      return;
    }

    const transaction = {
      entity_id: entityId,
      tipo,
      description: formData.description,
      amount,
      due_date: formData.due_date,
      payment_date: null,
      status: formData.status,
      category_id: formData.category_id || null,
      subcategory_id: formData.subcategory_id || null,
      account_id: formData.account_id || null,
      notes: formData.notes || null,
      reference_month: formData.reference_month,
      origin: 'MANUAL' as const
    };

    onSave(transaction);
  };

  const isReceita = tipo === 'RECEBER';
  const headerColor = isReceita ? 'bg-emerald-500' : 'bg-amber-400';
  const headerText = isReceita ? 'Nova receita' : 'Nova despesa';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        {/* Header */}
        <div className={cn("flex items-center justify-between px-4 py-3", headerColor)}>
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium",
              isReceita ? "text-white" : "text-black"
            )}>
              {headerText}
            </span>
            <ChevronDown className={cn("h-4 w-4", isReceita ? "text-white/70" : "text-black/70")} />
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            className={cn(
              "h-8 w-8 rounded-full",
              isReceita ? "text-white hover:bg-white/20" : "text-black hover:bg-black/10"
            )}
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Top Row - Value, Date, Competência, Repetição */}
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <Label className={cn("text-xs", showError && !formData.amount && "text-destructive")}>
                Valor (R$) *
              </Label>
              <Input
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => {
                  setFormData({ ...formData, amount: e.target.value });
                  setShowError(false);
                }}
                placeholder="0,00"
                className={cn(
                  "h-9 text-sm",
                  showError && !formData.amount && "border-destructive focus-visible:ring-destructive"
                )}
              />
              {showError && !formData.amount && (
                <p className="text-[10px] text-destructive">Informe um valor diferente de zero</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Data *</Label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Competência *</Label>
              <Input
                type="date"
                value={formData.reference_month.slice(0, 10)}
                onChange={(e) => setFormData({ ...formData, reference_month: e.target.value })}
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center gap-1">
                Repetição
                <HelpCircle className="h-3 w-3 text-muted-foreground" />
              </Label>
              <Select 
                value={formData.recurrence_type} 
                onValueChange={(v: RecurrenceType) => setFormData({ ...formData, recurrence_type: v })}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="UNICA">Única</SelectItem>
                  <SelectItem value="PARCELADA">Parcelada</SelectItem>
                  <SelectItem value="FIXA">Fixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Installments (show only if PARCELADA) */}
          {formData.recurrence_type === 'PARCELADA' && (
            <div className="grid grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Parcelas</Label>
                <Input
                  type="number"
                  min="2"
                  max="48"
                  value={formData.installments}
                  onChange={(e) => setFormData({ ...formData, installments: e.target.value })}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          )}

          {/* Description & Account Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Conta *</Label>
              <Select value={formData.account_id} onValueChange={(v) => setFormData({ ...formData, account_id: v })}>
                <SelectTrigger className="h-9 text-sm">
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
          </div>

          {/* Category & Subcategory Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Categoria *</Label>
              <Select 
                value={formData.category_id} 
                onValueChange={(v) => setFormData({ ...formData, category_id: v, subcategory_id: '' })}
              >
                <SelectTrigger className="h-9 text-sm">
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

            <div className="space-y-1.5">
              <Label className="text-xs">Subcategoria</Label>
              <Select 
                value={formData.subcategory_id} 
                onValueChange={(v) => setFormData({ ...formData, subcategory_id: v })}
                disabled={!formData.category_id}
              >
                <SelectTrigger className="h-9 text-sm">
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
          </div>

          {/* Payment Method & Document Number */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Forma de pagamento</Label>
              <Select value={formData.payment_method} onValueChange={(v) => setFormData({ ...formData, payment_method: v })}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DINHEIRO">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="TRANSFERENCIA">Transferência</SelectItem>
                  <SelectItem value="BOLETO">Boleto</SelectItem>
                  <SelectItem value="CARTAO">Cartão</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs flex items-center justify-between">
                <span>Número de documento</span>
                <span className="text-muted-foreground">{formData.document_number.length} / 60</span>
              </Label>
              <Input
                value={formData.document_number}
                onChange={(e) => setFormData({ ...formData, document_number: e.target.value.slice(0, 60) })}
                placeholder="Número de documento"
                className="h-9 text-sm"
                maxLength={60}
              />
            </div>
          </div>

          {/* Observações */}
          <div className="space-y-1.5">
            <Label className="text-xs flex items-center justify-between">
              <span>Observações</span>
              <span className="text-muted-foreground">{formData.notes.length} / 400</span>
            </Label>
            <Textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value.slice(0, 400) })}
              placeholder="Observações"
              rows={2}
              className="text-sm resize-none"
              maxLength={400}
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-emerald-600 hover:bg-emerald-50">
                <Check className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground">
                <X className="h-5 w-5" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="h-9 w-9 rounded-full text-muted-foreground">
                <Paperclip className="h-5 w-5" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button 
                type="submit" 
                disabled={isLoading}
                className={cn(
                  "gap-2",
                  isReceita ? "bg-emerald-600 hover:bg-emerald-700" : "bg-primary"
                )}
              >
                {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                Salvar
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                size="icon"
                className="h-9 w-9"
              >
                <span className="text-lg">+</span>
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
