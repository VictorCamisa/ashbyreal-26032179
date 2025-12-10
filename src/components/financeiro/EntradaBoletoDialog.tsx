import { useState, useRef } from 'react';
import { Camera, FileText, Receipt, Loader2, Upload, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCategorias } from '@/hooks/useCategorias';
import { useEntities } from '@/hooks/useEntities';
import { useAccounts } from '@/hooks/useAccounts';

interface EntradaBoletoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (transaction: any) => void;
  isLoading?: boolean;
}

type Step = 'tipo' | 'captura' | 'revisao';

interface BoletoData {
  description: string;
  amount: string;
  due_date: string;
  beneficiario: string;
  notes: string;
}

export function EntradaBoletoDialog({ open, onOpenChange, onSave, isLoading }: EntradaBoletoDialogProps) {
  const [step, setStep] = useState<Step>('tipo');
  const [tipoNota, setTipoNota] = useState<'COM_NOTA' | 'SEM_NOTA' | null>(null);
  const [imageData, setImageData] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [boletoData, setBoletoData] = useState<BoletoData>({
    description: '',
    amount: '',
    due_date: '',
    beneficiario: '',
    notes: '',
  });
  const [formData, setFormData] = useState({
    entity_id: '',
    category_id: '',
    account_id: '',
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const categoriasQuery = useCategorias();
  const entitiesQuery = useEntities();
  const accountsQuery = useAccounts();

  const categorias = categoriasQuery.data || [];
  const entities = entitiesQuery.data || [];
  const accounts = accountsQuery.data || [];

  const despesaCategorias = categorias.filter(c => c.type === 'DESPESA');
  const filteredAccounts = accounts.filter(a => a.entity_id === formData.entity_id);

  const resetDialog = () => {
    setStep('tipo');
    setTipoNota(null);
    setImageData(null);
    setBoletoData({
      description: '',
      amount: '',
      due_date: '',
      beneficiario: '',
      notes: '',
    });
    setFormData({
      entity_id: '',
      category_id: '',
      account_id: '',
    });
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      resetDialog();
    }
    onOpenChange(open);
  };

  const handleTipoSelect = (tipo: 'COM_NOTA' | 'SEM_NOTA') => {
    setTipoNota(tipo);
    setStep('captura');
  };

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImageData(base64);
      await processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (base64Image: string) => {
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('process-boleto', {
        body: { 
          image: base64Image,
          tipoNota 
        },
      });

      if (error) throw error;

      if (data?.extracted) {
        setBoletoData({
          description: data.extracted.description || '',
          amount: data.extracted.amount || '',
          due_date: data.extracted.due_date || '',
          beneficiario: data.extracted.beneficiario || '',
          notes: tipoNota === 'COM_NOTA' ? 'Boleto COM NOTA FISCAL' : 'Boleto SEM NOTA FISCAL',
        });
        toast.success('Dados extraídos com sucesso!');
      } else {
        toast.warning('Não foi possível extrair todos os dados. Preencha manualmente.');
      }
      setStep('revisao');
    } catch (error: any) {
      console.error('Erro ao processar imagem:', error);
      toast.error('Erro ao processar boleto: ' + error.message);
      setStep('revisao');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.entity_id || !boletoData.amount || !boletoData.due_date) {
      toast.error('Preencha os campos obrigatórios');
      return;
    }

    const transaction = {
      entity_id: formData.entity_id,
      tipo: 'PAGAR',
      amount: boletoData.amount.replace(',', '.'),
      due_date: boletoData.due_date,
      description: boletoData.description || boletoData.beneficiario || 'Boleto',
      category_id: formData.category_id || null,
      account_id: formData.account_id || null,
      status: 'PREVISTO',
      origin: 'MANUAL',
      notes: boletoData.notes,
      reference_month: boletoData.due_date.substring(0, 7) + '-01',
    };

    onSave(transaction);
    handleOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Entrada de Boleto
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Tipo de Nota */}
        {step === 'tipo' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Este boleto possui nota fiscal?
            </p>
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
                onClick={() => handleTipoSelect('COM_NOTA')}
              >
                <FileText className="h-8 w-8 text-green-600" />
                <span className="font-medium">COM NOTA</span>
              </Button>
              <Button
                variant="outline"
                className="h-24 flex flex-col gap-2 hover:border-primary hover:bg-primary/5"
                onClick={() => handleTipoSelect('SEM_NOTA')}
              >
                <Receipt className="h-8 w-8 text-orange-600" />
                <span className="font-medium">SEM NOTA</span>
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Captura de Imagem */}
        {step === 'captura' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              {tipoNota === 'COM_NOTA' ? (
                <FileText className="h-5 w-5 text-green-600" />
              ) : (
                <Receipt className="h-5 w-5 text-orange-600" />
              )}
              <span className="text-sm font-medium">
                Boleto {tipoNota === 'COM_NOTA' ? 'COM' : 'SEM'} Nota Fiscal
              </span>
            </div>

            {isProcessing ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">
                  Processando imagem com IA...
                </p>
              </div>
            ) : imageData ? (
              <div className="relative">
                <img 
                  src={imageData} 
                  alt="Boleto capturado" 
                  className="w-full rounded-lg border"
                />
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={() => setImageData(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Tire uma foto ou envie uma imagem do boleto
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                    onClick={() => cameraInputRef.current?.click()}
                  >
                    <Camera className="h-6 w-6" />
                    <span className="text-xs">Câmera</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="h-20 flex flex-col gap-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-6 w-6" />
                    <span className="text-xs">Galeria</span>
                  </Button>
                </div>
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleImageCapture}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageCapture}
                />
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => setStep('revisao')}
                >
                  Pular e preencher manualmente
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Revisão e Confirmação */}
        {step === 'revisao' && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50">
              {tipoNota === 'COM_NOTA' ? (
                <FileText className="h-5 w-5 text-green-600" />
              ) : (
                <Receipt className="h-5 w-5 text-orange-600" />
              )}
              <span className="text-sm font-medium">
                Boleto {tipoNota === 'COM_NOTA' ? 'COM' : 'SEM'} Nota Fiscal
              </span>
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="entity">Entidade *</Label>
                <Select
                  value={formData.entity_id}
                  onValueChange={(value) => setFormData({ ...formData, entity_id: value, account_id: '' })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a entidade" />
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

              <div className="grid gap-2">
                <Label htmlFor="beneficiario">Beneficiário</Label>
                <Input
                  id="beneficiario"
                  value={boletoData.beneficiario}
                  onChange={(e) => setBoletoData({ ...boletoData, beneficiario: e.target.value })}
                  placeholder="Nome do beneficiário"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Input
                  id="description"
                  value={boletoData.description}
                  onChange={(e) => setBoletoData({ ...boletoData, description: e.target.value })}
                  placeholder="Descrição do boleto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="amount">Valor *</Label>
                  <Input
                    id="amount"
                    value={boletoData.amount}
                    onChange={(e) => setBoletoData({ ...boletoData, amount: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="due_date">Vencimento *</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={boletoData.due_date}
                    onChange={(e) => setBoletoData({ ...boletoData, due_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {despesaCategorias.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="account">Conta</Label>
                <Select
                  value={formData.account_id}
                  onValueChange={(value) => setFormData({ ...formData, account_id: value })}
                  disabled={!formData.entity_id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a conta" />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="notes">Observações</Label>
                <Textarea
                  id="notes"
                  value={boletoData.notes}
                  onChange={(e) => setBoletoData({ ...boletoData, notes: e.target.value })}
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
