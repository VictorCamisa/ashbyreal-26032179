import { useState, useRef, useEffect } from 'react';
import { Camera, FileText, Receipt, Loader2, Upload, X, Plus, Trash2 } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useCategorias } from '@/hooks/useCategorias';
import { useEntities } from '@/hooks/useEntities';
import { useBoletos } from '@/hooks/useBoletos';

interface EntradaBoletoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Step = 'tipo' | 'captura' | 'revisao';

interface BoletoItem {
  id: string;
  description: string;
  amount: string;
  due_date: string;
  beneficiario: string;
  numero_movimento: string;
  notes: string;
  imageData: string | null;
  processed: boolean;
}

export function EntradaBoletoDialog({ open, onOpenChange }: EntradaBoletoDialogProps) {
  const [step, setStep] = useState<Step>('tipo');
  const [tipoNota, setTipoNota] = useState<'COM_NOTA' | 'SEM_NOTA' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [boletos, setBoletos] = useState<BoletoItem[]>([]);
  const [currentBoletoIndex, setCurrentBoletoIndex] = useState(0);
  const [entityId, setEntityId] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const categoriasQuery = useCategorias();
  const entitiesQuery = useEntities();
  const { createBoleto, isCreating } = useBoletos();

  const entities = entitiesQuery.data || [];

  const resetDialog = () => {
    setStep('tipo');
    setTipoNota(null);
    setBoletos([]);
    setCurrentBoletoIndex(0);
    setEntityId('');
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

  const createEmptyBoleto = (): BoletoItem => ({
    id: crypto.randomUUID(),
    description: '',
    amount: '',
    due_date: '',
    beneficiario: '',
    numero_movimento: '',
    notes: tipoNota === 'COM_NOTA' ? 'Boleto COM NOTA FISCAL' : 'Boleto SEM NOTA FISCAL',
    imageData: null,
    processed: false,
  });

  // Auto-select LOJA entity
  useEffect(() => {
    const lojaEntity = entities.find(e => e.type === 'LOJA');
    if (lojaEntity && !entityId) {
      setEntityId(lojaEntity.id);
    }
  }, [entities, entityId]);

  const handleImageCapture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Process multiple files
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      await processFile(file);
    }
  };

  const processFile = async (file: File) => {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result as string;
        
        // Create a new boleto entry
        const newBoleto = createEmptyBoleto();
        newBoleto.imageData = base64;
        
        setBoletos(prev => [...prev, newBoleto]);
        
        // Process with AI
        await processImage(base64, newBoleto.id);
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  const processImage = async (base64Image: string, boletoId: string) => {
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
        setBoletos(prev => prev.map(b => 
          b.id === boletoId 
            ? {
                ...b,
                description: data.extracted.description || '',
                amount: data.extracted.amount || '',
                due_date: data.extracted.due_date || '',
                beneficiario: data.extracted.beneficiario || '',
                numero_movimento: data.extracted.numero_movimento || '',
                processed: true,
              }
            : b
        ));
        toast.success('Dados extraídos com sucesso!');
      } else {
        setBoletos(prev => prev.map(b => 
          b.id === boletoId ? { ...b, processed: true } : b
        ));
        toast.warning('Não foi possível extrair todos os dados. Preencha manualmente.');
      }
    } catch (error: any) {
      console.error('Erro ao processar imagem:', error);
      toast.error('Erro ao processar boleto: ' + error.message);
      setBoletos(prev => prev.map(b => 
        b.id === boletoId ? { ...b, processed: true } : b
      ));
    } finally {
      setIsProcessing(false);
    }
  };

  const goToReview = () => {
    if (boletos.length === 0) {
      // Add empty boleto for manual entry
      setBoletos([createEmptyBoleto()]);
    }
    setStep('revisao');
  };

  const addManualBoleto = () => {
    setBoletos(prev => [...prev, createEmptyBoleto()]);
    setCurrentBoletoIndex(boletos.length);
  };

  const removeBoleto = (id: string) => {
    setBoletos(prev => prev.filter(b => b.id !== id));
    if (currentBoletoIndex >= boletos.length - 1) {
      setCurrentBoletoIndex(Math.max(0, boletos.length - 2));
    }
  };

  const updateCurrentBoleto = (field: keyof BoletoItem, value: string) => {
    setBoletos(prev => prev.map((b, i) => 
      i === currentBoletoIndex ? { ...b, [field]: value } : b
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!entityId) {
      toast.error('Selecione a entidade');
      return;
    }

    const invalidBoletos = boletos.filter(b => !b.amount || !b.due_date);
    if (invalidBoletos.length > 0) {
      toast.error('Preencha valor e vencimento de todos os boletos');
      return;
    }

    // Save all boletos
    for (const boleto of boletos) {
      createBoleto({
        entity_id: entityId,
        description: boleto.description || boleto.beneficiario || 'Boleto',
        beneficiario: boleto.beneficiario,
        amount: parseFloat(boleto.amount.replace(',', '.')),
        due_date: boleto.due_date,
        tipo_nota: tipoNota!,
        status: 'PENDENTE',
        image_base64: boleto.imageData,
        notes: boleto.notes,
      });
    }

    handleOpenChange(false);
  };

  const currentBoleto = boletos[currentBoletoIndex];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary" />
            Entrada de Boleto
            {boletos.length > 0 && (
              <Badge variant="secondary">{boletos.length} boleto(s)</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-120px)]">
          {/* Step 1: Tipo de Nota */}
          {step === 'tipo' && (
            <div className="space-y-4 p-1">
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
            <div className="space-y-4 p-1">
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
              ) : (
                <div className="space-y-4">
                  {boletos.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">Boletos capturados:</p>
                      <div className="flex flex-wrap gap-2">
                        {boletos.map((b, i) => (
                          <Badge key={b.id} variant="secondary" className="gap-1">
                            {b.beneficiario || `Boleto ${i + 1}`}
                            {b.amount && ` - R$ ${b.amount}`}
                            <button
                              onClick={() => removeBoleto(b.id)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground text-center">
                    Tire fotos ou envie imagens dos boletos
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
                    multiple
                    className="hidden"
                    onChange={handleImageCapture}
                  />
                  
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      className="flex-1"
                      onClick={goToReview}
                    >
                      Preencher manualmente
                    </Button>
                    {boletos.length > 0 && (
                      <Button
                        className="flex-1"
                        onClick={goToReview}
                      >
                        Revisar ({boletos.length})
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Revisão e Confirmação */}
          {step === 'revisao' && currentBoleto && (
            <form onSubmit={handleSubmit} className="space-y-4 p-1">
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

              {/* Boleto Navigation */}
              {boletos.length > 1 && (
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">
                    Boleto {currentBoletoIndex + 1} de {boletos.length}
                  </p>
                  <div className="flex gap-1 ml-auto">
                    {boletos.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setCurrentBoletoIndex(i)}
                        className={`w-8 h-8 rounded-md text-sm font-medium ${
                          i === currentBoletoIndex 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Image Preview */}
              {currentBoleto.imageData && (
                <div className="relative">
                  <img 
                    src={currentBoleto.imageData} 
                    alt="Boleto" 
                    className="w-full h-32 object-cover rounded-lg border"
                  />
                </div>
              )}

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Entidade</Label>
                  <div className="flex items-center h-10 px-3 rounded-md border bg-muted/50 text-sm">
                    LOJA
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="beneficiario">Beneficiário</Label>
                    <Input
                      id="beneficiario"
                      value={currentBoleto.beneficiario}
                      onChange={(e) => updateCurrentBoleto('beneficiario', e.target.value)}
                      placeholder="Nome do beneficiário"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="numero_movimento">NÚM. MOV</Label>
                    <Input
                      id="numero_movimento"
                      value={currentBoleto.numero_movimento}
                      onChange={(e) => updateCurrentBoleto('numero_movimento', e.target.value)}
                      placeholder="Ex: 122653"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input
                    id="description"
                    value={currentBoleto.description}
                    onChange={(e) => updateCurrentBoleto('description', e.target.value)}
                    placeholder="Descrição do boleto"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Valor *</Label>
                    <Input
                      id="amount"
                      value={currentBoleto.amount}
                      onChange={(e) => updateCurrentBoleto('amount', e.target.value)}
                      placeholder="0,00"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="due_date">Vencimento *</Label>
                    <Input
                      id="due_date"
                      type="date"
                      value={currentBoleto.due_date}
                      onChange={(e) => updateCurrentBoleto('due_date', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="notes">Observações</Label>
                  <Textarea
                    id="notes"
                    value={currentBoleto.notes}
                    onChange={(e) => updateCurrentBoleto('notes', e.target.value)}
                    rows={2}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addManualBoleto}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Boleto
                </Button>
                {boletos.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeBoleto(currentBoleto.id)}
                    className="gap-1 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                    Remover
                  </Button>
                )}
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
                <Button type="submit" className="flex-1" disabled={isCreating}>
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    `Salvar ${boletos.length} Boleto${boletos.length > 1 ? 's' : ''}`
                  )}
                </Button>
              </div>
            </form>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
