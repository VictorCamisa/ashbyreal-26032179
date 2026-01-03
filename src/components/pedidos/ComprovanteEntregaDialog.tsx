import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Printer, X, Check, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

interface ComprovanteEntregaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  onConfirm: () => void;
}

interface PedidoData {
  numero_pedido: string;
  valor_total: number;
  observacoes: string | null;
  cliente: {
    nome: string;
    telefone: string;
    email: string;
    cpf_cnpj: string | null;
    endereco: any;
  } | null;
  itens: Array<{
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
    produto: {
      nome: string;
    } | null;
  }>;
}

export function ComprovanteEntregaDialog({
  open,
  onOpenChange,
  pedidoId,
  onConfirm,
}: ComprovanteEntregaDialogProps) {
  const [pedidoData, setPedidoData] = useState<PedidoData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    dataEntrega: new Date().toISOString().split('T')[0],
    periodoEntrega: 'integral',
    metodoPagamento: 'pix',
    observacoes: '',
    cpfCnpj: '',
    telefone: '',
    // Controle de barris
    barril50: { estoque: '', entregue: '', retirado: '' },
    barril30: { estoque: '', entregue: '', retirado: '' },
    barril10: { estoque: '', entregue: '', retirado: '' },
    co2: { estoque: '', entregue: '', retirado: '' },
  });

  useEffect(() => {
    if (open && pedidoId) {
      fetchPedidoData();
      // Reset signature
      setHasSignature(false);
      setTimeout(() => {
        clearSignature();
      }, 100);
    }
  }, [open, pedidoId]);

  const fetchPedidoData = async () => {
    setIsLoading(true);
    try {
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('numero_pedido, valor_total, observacoes, cliente_id')
        .eq('id', pedidoId)
        .single();

      if (!pedido) return;

      const { data: cliente } = await supabase
        .from('clientes')
        .select('nome, telefone, email, cpf_cnpj, endereco')
        .eq('id', pedido.cliente_id)
        .single();

      const { data: itensData } = await supabase
        .from('pedido_itens')
        .select('quantidade, preco_unitario, subtotal, produtos(nome)')
        .eq('pedido_id', pedidoId);

      const itens = (itensData || []).map(item => ({
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario,
        subtotal: item.subtotal,
        produto: item.produtos,
      }));

      setPedidoData({
        numero_pedido: String(pedido.numero_pedido),
        valor_total: pedido.valor_total,
        observacoes: pedido.observacoes,
        cliente,
        itens,
      });

      setFormData(prev => ({
        ...prev,
        observacoes: pedido.observacoes || '',
        cpfCnpj: cliente?.cpf_cnpj || '',
        telefone: cliente?.telefone || '',
      }));
    } catch (error) {
      console.error('Error fetching pedido:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Signature canvas functions
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
    initCanvas();
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const formatEndereco = (endereco: any) => {
    if (!endereco) return '-';
    if (typeof endereco === 'string') return endereco;
    const parts = [];
    if (endereco.rua) parts.push(endereco.rua);
    if (endereco.numero) parts.push(endereco.numero);
    if (endereco.bairro) parts.push(endereco.bairro);
    if (endereco.cidade) parts.push(endereco.cidade);
    if (endereco.estado) parts.push(endereco.estado);
    return parts.join(', ') || '-';
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none print:max-h-none print:overflow-visible">
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5" />
            Comprovante de Entrega - Pedido #{pedidoData?.numero_pedido?.slice(-8)}
          </DialogTitle>
        </DialogHeader>

        {/* Printable Content */}
        <div className="space-y-6 print:p-8">
          {/* Header - Company Info */}
          <div className="text-center border-b pb-4 print:border-black">
            <h1 className="text-2xl font-bold">TAUBATÉ CHOPP</h1>
            <p className="text-sm text-muted-foreground print:text-black">
              TaubateChopp - (12) 3432-6712 / 99109-2301
            </p>
            <p className="text-sm text-muted-foreground print:text-black">
              www.choppemtaubate.com.br
            </p>
            <p className="text-sm text-muted-foreground print:text-black">
              Rua Emílio Winther, 1117 - Jd. das Nações - Taubaté - SP / CEP 12030-000
            </p>
            <div className="mt-2 text-right">
              <span className="font-bold text-lg">Nº {pedidoData?.numero_pedido?.slice(-5)}</span>
            </div>
          </div>

          {/* Cliente Info */}
          <div className="grid grid-cols-2 gap-4 text-sm border p-4 rounded-lg print:border-black">
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground">Cliente</Label>
              <p className="font-medium">{pedidoData?.cliente?.nome || '-'}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground">CNPJ/CPF</Label>
              <Input
                value={formData.cpfCnpj}
                onChange={(e) => setFormData(prev => ({ ...prev, cpfCnpj: e.target.value }))}
                className="h-8 font-medium"
                placeholder="CPF ou CNPJ"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs text-muted-foreground">Endereço</Label>
              <p className="font-medium">{formatEndereco(pedidoData?.cliente?.endereco)}</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-xs text-muted-foreground">Fone</Label>
              <Input
                value={formData.telefone}
                onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                className="h-8 font-medium"
                placeholder="Telefone"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="border rounded-lg overflow-hidden print:border-black">
            <table className="w-full text-sm">
              <thead className="bg-muted print:bg-gray-200">
                <tr>
                  <th className="p-2 text-left border-r">Quant.</th>
                  <th className="p-2 text-left border-r">Descrição da Mercadoria</th>
                  <th className="p-2 text-right border-r">Preço unitário</th>
                  <th className="p-2 text-right">Preço total</th>
                </tr>
              </thead>
              <tbody>
                {pedidoData?.itens.map((item, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-2 border-r">{item.quantidade}</td>
                    <td className="p-2 border-r">{item.produto?.nome || 'Produto'}</td>
                    <td className="p-2 text-right border-r">R$ {item.preco_unitario.toFixed(2)}</td>
                    <td className="p-2 text-right">R$ {item.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
                {/* Empty rows for printing */}
                {Array.from({ length: Math.max(0, 5 - (pedidoData?.itens.length || 0)) }).map((_, i) => (
                  <tr key={`empty-${i}`} className="border-t h-8">
                    <td className="p-2 border-r"></td>
                    <td className="p-2 border-r"></td>
                    <td className="p-2 border-r"></td>
                    <td className="p-2"></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Observations and Total */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Observação</Label>
              <Textarea
                value={formData.observacoes}
                onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                className="h-20 print:border-black"
                placeholder="Observações..."
              />
            </div>
            <div className="flex flex-col justify-end">
              <div className="border rounded-lg p-4 print:border-black">
                <Label className="text-xs text-muted-foreground">TOTAL</Label>
                <p className="text-2xl font-bold text-primary print:text-black">
                  R$ {pedidoData?.valor_total.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Controle de Barris */}
          <div className="border rounded-lg p-4 print:border-black">
            <h3 className="font-semibold mb-3">CONTROLE DE BARRIS</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="text-left p-1">Produtos</th>
                  <th className="p-1">50 lts</th>
                  <th className="p-1">30 lts</th>
                  <th className="p-1">10 lts</th>
                  <th className="p-1">Co2</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-1">Estoque</td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.barril50.estoque} onChange={(e) => setFormData(prev => ({ ...prev, barril50: { ...prev.barril50, estoque: e.target.value } }))} /></td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.barril30.estoque} onChange={(e) => setFormData(prev => ({ ...prev, barril30: { ...prev.barril30, estoque: e.target.value } }))} /></td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.barril10.estoque} onChange={(e) => setFormData(prev => ({ ...prev, barril10: { ...prev.barril10, estoque: e.target.value } }))} /></td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.co2.estoque} onChange={(e) => setFormData(prev => ({ ...prev, co2: { ...prev.co2, estoque: e.target.value } }))} /></td>
                </tr>
                <tr>
                  <td className="p-1">Entregue</td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.barril50.entregue} onChange={(e) => setFormData(prev => ({ ...prev, barril50: { ...prev.barril50, entregue: e.target.value } }))} /></td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.barril30.entregue} onChange={(e) => setFormData(prev => ({ ...prev, barril30: { ...prev.barril30, entregue: e.target.value } }))} /></td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.barril10.entregue} onChange={(e) => setFormData(prev => ({ ...prev, barril10: { ...prev.barril10, entregue: e.target.value } }))} /></td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.co2.entregue} onChange={(e) => setFormData(prev => ({ ...prev, co2: { ...prev.co2, entregue: e.target.value } }))} /></td>
                </tr>
                <tr>
                  <td className="p-1">Retirado</td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.barril50.retirado} onChange={(e) => setFormData(prev => ({ ...prev, barril50: { ...prev.barril50, retirado: e.target.value } }))} /></td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.barril30.retirado} onChange={(e) => setFormData(prev => ({ ...prev, barril30: { ...prev.barril30, retirado: e.target.value } }))} /></td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.barril10.retirado} onChange={(e) => setFormData(prev => ({ ...prev, barril10: { ...prev.barril10, retirado: e.target.value } }))} /></td>
                  <td className="p-1"><Input className="h-6 w-12 text-center text-xs" value={formData.co2.retirado} onChange={(e) => setFormData(prev => ({ ...prev, co2: { ...prev.co2, retirado: e.target.value } }))} /></td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Entrega e Pagamento */}
          <div className="grid grid-cols-2 gap-4">
            {/* Entrega */}
            <div className="border rounded-lg p-4 print:border-black">
              <h3 className="font-semibold mb-3">ENTREGA</h3>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Data</Label>
                  <Input
                    type="date"
                    value={formData.dataEntrega}
                    onChange={(e) => setFormData(prev => ({ ...prev, dataEntrega: e.target.value }))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-2 block">Período</Label>
                  <RadioGroup
                    value={formData.periodoEntrega}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, periodoEntrega: value }))}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="manha" id="manha" />
                      <Label htmlFor="manha" className="text-xs">Manhã</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="tarde" id="tarde" />
                      <Label htmlFor="tarde" className="text-xs">Tarde</Label>
                    </div>
                    <div className="flex items-center space-x-1">
                      <RadioGroupItem value="integral" id="integral" />
                      <Label htmlFor="integral" className="text-xs">Integral</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>

            {/* Pagamento */}
            <div className="border rounded-lg p-4 print:border-black">
              <h3 className="font-semibold mb-3">PAGAMENTO</h3>
              <RadioGroup
                value={formData.metodoPagamento}
                onValueChange={(value) => setFormData(prev => ({ ...prev, metodoPagamento: value }))}
                className="grid grid-cols-2 gap-2"
              >
                <div className="flex items-center space-x-2 border rounded p-2">
                  <RadioGroupItem value="dinheiro" id="dinheiro" />
                  <Label htmlFor="dinheiro" className="text-sm">Dinheiro</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded p-2">
                  <RadioGroupItem value="cartao" id="cartao" />
                  <Label htmlFor="cartao" className="text-sm">Cartão</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded p-2">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="text-sm">PIX</Label>
                </div>
                <div className="flex items-center space-x-2 border rounded p-2">
                  <RadioGroupItem value="boleto" id="boleto" />
                  <Label htmlFor="boleto" className="text-sm">Boleto</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          {/* Signature Section */}
          <div className="border rounded-lg p-4 print:border-black">
            <p className="text-sm mb-4">
              Recebi(emos) de <strong>TAUBATÉ CHOPP</strong> os produtos constantes deste pedido.
            </p>
            <div className="flex flex-col items-center gap-2">
              <Label className="text-xs text-muted-foreground">Assinatura do Cliente</Label>
              <div className="relative w-full">
                <canvas
                  ref={canvasRef}
                  width={500}
                  height={100}
                  className="border rounded-lg w-full bg-white cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute top-1 right-1 h-6 px-2 print:hidden"
                  onClick={clearSignature}
                >
                  <X className="h-3 w-3 mr-1" />
                  Limpar
                </Button>
              </div>
              <div className="flex items-center gap-2 w-full mt-2">
                <Separator className="flex-1" />
                <span className="text-xs text-muted-foreground">
                  {pedidoData?.cliente?.nome || 'Nome do Cliente'}
                </span>
                <Separator className="flex-1" />
              </div>
              <p className="text-xs text-muted-foreground">
                ________ de _________________ de 20____
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-4 border-t print:hidden">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button variant="success" onClick={handleConfirm} disabled={!hasSignature}>
            <Check className="h-4 w-4 mr-2" />
            Confirmar Pagamento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
