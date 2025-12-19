import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { usePedidosMutations } from '@/hooks/usePedidosMutations';
import { useClientes } from '@/hooks/useClientes';
import {
  Camera,
  ImagePlus,
  Loader2,
  ScanLine,
  Check,
  X,
  AlertCircle,
  User,
  Package,
  ShoppingCart,
} from 'lucide-react';

interface ExtractedItem {
  nomeProdutoOriginal: string;
  quantidade: number;
  precoUnitario?: number;
  produtoEncontrado?: {
    id: string;
    nome: string;
    preco: number;
    estoque: number;
  } | null;
  confiancaMatch: number;
}

interface ExtractedData {
  cliente?: {
    nome?: string;
    telefone?: string;
    email?: string;
    empresa?: string;
  };
  itens: ExtractedItem[];
  metodoPagamento?: string;
  observacoes?: string;
  dataEntrega?: string;
  confianca: number;
}

interface ScanResult {
  success: boolean;
  dadosExtraidos: ExtractedData;
  clienteEncontrado?: {
    id: string;
    nome: string;
    telefone: string;
    email: string;
    empresa?: string;
  } | null;
  produtosDisponiveis?: Array<{
    id: string;
    nome: string;
    preco: number;
    estoque: number;
  }>;
  error?: string;
}

interface EscanearPedidoDialogProps {
  onSuccess?: () => void;
}

export function EscanearPedidoDialog({ onSuccess }: EscanearPedidoDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'capture' | 'processing' | 'preview'>('capture');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedClienteId, setSelectedClienteId] = useState<string | null>(null);
  const [editedItems, setEditedItems] = useState<ExtractedItem[]>([]);
  const [metodoPagamento, setMetodoPagamento] = useState<string>('');
  const [observacoes, setObservacoes] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { createPedido } = usePedidosMutations();
  const { clientes } = useClientes();

  const resetDialog = () => {
    setStep('capture');
    setImagePreview(null);
    setScanResult(null);
    setSelectedClienteId(null);
    setEditedItems([]);
    setMetodoPagamento('');
    setObservacoes('');
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      setImagePreview(base64);
      await processImage(base64);
    };
    reader.readAsDataURL(file);
  };

  const processImage = async (imageBase64: string) => {
    setStep('processing');

    try {
      const { data, error } = await supabase.functions.invoke('scan-order', {
        body: { imageBase64 },
      });

      if (error) throw error;

      if (!data.success) {
        throw new Error(data.error || 'Erro ao processar imagem');
      }

      setScanResult(data);
      setEditedItems(data.dadosExtraidos.itens || []);
      setMetodoPagamento(data.dadosExtraidos.metodoPagamento || '');
      setObservacoes(data.dadosExtraidos.observacoes || '');
      
      if (data.clienteEncontrado) {
        setSelectedClienteId(data.clienteEncontrado.id);
      }

      setStep('preview');
    } catch (error) {
      console.error('Erro ao escanear pedido:', error);
      toast({
        title: 'Erro ao processar imagem',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
      setStep('capture');
      setImagePreview(null);
    }
  };

  const handleUpdateItemQuantity = (index: number, quantidade: number) => {
    setEditedItems(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantidade };
      return updated;
    });
  };

  const handleUpdateItemProduct = (index: number, produtoId: string) => {
    const produto = scanResult?.produtosDisponiveis?.find(p => p.id === produtoId);
    if (!produto) return;

    setEditedItems(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        produtoEncontrado: produto,
        confiancaMatch: 100,
      };
      return updated;
    });
  };

  const handleRemoveItem = (index: number) => {
    setEditedItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return editedItems.reduce((acc, item) => {
      const preco = item.produtoEncontrado?.preco || item.precoUnitario || 0;
      return acc + preco * item.quantidade;
    }, 0);
  };

  const canConfirm = () => {
    return (
      selectedClienteId &&
      editedItems.length > 0 &&
      editedItems.every(item => item.produtoEncontrado)
    );
  };

  const handleConfirm = async () => {
    if (!selectedClienteId || !canConfirm()) return;

    setIsCreating(true);

    try {
      const cartItems = editedItems.map(item => ({
        produtoId: item.produtoEncontrado!.id,
        nome: item.produtoEncontrado!.nome,
        quantidade: item.quantidade,
        precoUnitario: item.produtoEncontrado!.preco,
        estoque: item.produtoEncontrado!.estoque,
      }));

      // Create the order
      const pedido = await createPedido({
        clienteId: selectedClienteId,
        items: cartItems,
        metodoPagamento: metodoPagamento || undefined,
        observacoes: observacoes || undefined,
      });

      // Register interaction
      await supabase.from('interacoes').insert({
        cliente_id: selectedClienteId,
        tipo: 'venda',
        descricao: `Pedido escaneado via IA - ${cartItems.length} itens - R$ ${calculateTotal().toFixed(2)}`,
        responsavel: 'Sistema (IA)',
        data: new Date().toISOString(),
      });

      toast({
        title: 'Pedido criado com sucesso!',
        description: `Pedido criado a partir do escaneamento`,
      });

      setOpen(false);
      resetDialog();
      onSuccess?.();
    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: 'Erro ao criar pedido',
        description: 'Não foi possível criar o pedido. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <ScanLine className="h-4 w-4" />
          Escanear Pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5" />
            Escanear Pedido com IA
          </DialogTitle>
          <DialogDescription>
            {step === 'capture' && 'Tire uma foto ou selecione uma imagem do pedido'}
            {step === 'processing' && 'Processando imagem com inteligência artificial...'}
            {step === 'preview' && 'Confira os dados extraídos antes de confirmar'}
          </DialogDescription>
        </DialogHeader>

        {/* Step: Capture */}
        {step === 'capture' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Button
                variant="outline"
                className="h-32 flex-col gap-3"
                onClick={() => cameraInputRef.current?.click()}
              >
                <Camera className="h-8 w-8" />
                <span>Usar Câmera</span>
              </Button>
              <Button
                variant="outline"
                className="h-32 flex-col gap-3"
                onClick={() => fileInputRef.current?.click()}
              >
                <ImagePlus className="h-8 w-8" />
                <span>Selecionar Imagem</span>
              </Button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileSelect}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileSelect}
            />

            <p className="text-sm text-muted-foreground text-center">
              A IA irá identificar automaticamente os produtos, cliente e valores do pedido
            </p>
          </div>
        )}

        {/* Step: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-muted-foreground">Analisando imagem...</p>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="Preview"
                className="max-h-48 rounded-lg opacity-50"
              />
            )}
          </div>
        )}

        {/* Step: Preview */}
        {step === 'preview' && scanResult && (
          <div className="space-y-6">
            {/* Confidence Badge */}
            <div className="flex items-center justify-between">
              <Badge variant={scanResult.dadosExtraidos.confianca >= 70 ? 'default' : 'secondary'}>
                Confiança: {scanResult.dadosExtraidos.confianca}%
              </Badge>
              {imagePreview && (
                <Button variant="ghost" size="sm" onClick={() => setStep('capture')}>
                  Escanear outra imagem
                </Button>
              )}
            </div>

            {/* Cliente Section */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <User className="h-4 w-4" />
                  Cliente
                </div>
                
                {scanResult.clienteEncontrado ? (
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>Cliente encontrado: {scanResult.clienteEncontrado.nome}</span>
                  </div>
                ) : scanResult.dadosExtraidos.cliente?.nome && (
                  <div className="flex items-center gap-2 text-amber-600">
                    <AlertCircle className="h-4 w-4" />
                    <span>Cliente não encontrado: {scanResult.dadosExtraidos.cliente.nome}</span>
                  </div>
                )}

                <Select value={selectedClienteId || ''} onValueChange={setSelectedClienteId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar cliente..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes?.map(cliente => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome} - {cliente.telefone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Products Section */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Package className="h-4 w-4" />
                  Produtos ({editedItems.length})
                </div>

                {editedItems.map((item, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        {item.produtoEncontrado ? (
                          <Check className="h-4 w-4 text-green-500 shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                        )}
                        <span className="text-sm text-muted-foreground truncate">
                          Detectado: {item.nomeProdutoOriginal}
                        </span>
                      </div>
                      
                      <Select
                        value={item.produtoEncontrado?.id || ''}
                        onValueChange={(value) => handleUpdateItemProduct(index, value)}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Selecionar produto..." />
                        </SelectTrigger>
                        <SelectContent>
                          {scanResult.produtosDisponiveis?.map(produto => (
                            <SelectItem key={produto.id} value={produto.id}>
                              {produto.nome} - R$ {produto.preco.toFixed(2)} (Est: {produto.estoque})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Input
                      type="number"
                      min={1}
                      value={item.quantidade}
                      onChange={(e) => handleUpdateItemQuantity(index, parseInt(e.target.value) || 1)}
                      className="w-20 h-8"
                    />

                    <span className="w-24 text-right font-medium">
                      R$ {((item.produtoEncontrado?.preco || 0) * item.quantidade).toFixed(2)}
                    </span>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleRemoveItem(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {editedItems.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum produto identificado
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Payment & Observations */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Método de Pagamento</Label>
                <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="boleto">Boleto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Total</Label>
                <div className="h-10 px-3 py-2 rounded-md border bg-muted/50 font-bold text-lg flex items-center">
                  R$ {calculateTotal().toFixed(2)}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações do pedido..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setOpen(false);
                  resetDialog();
                }}
              >
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleConfirm}
                disabled={!canConfirm() || isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ShoppingCart className="h-4 w-4" />
                )}
                Criar Pedido
              </Button>
            </div>

            {!canConfirm() && (
              <p className="text-sm text-amber-600 text-center">
                {!selectedClienteId
                  ? 'Selecione um cliente para continuar'
                  : 'Todos os produtos devem estar vinculados'}
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
