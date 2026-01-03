import { useState, useRef, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { Check, Loader2, AlertCircle, Eraser, Send } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReceiptData {
  id: string;
  status: string;
  cliente_nome: string;
  cliente_telefone: string;
  cliente_cpf_cnpj: string;
  cliente_endereco: any;
  controle_barris: any;
  data_entrega: string;
  periodo_entrega: string;
  metodo_pagamento: string;
  observacoes: string;
  numero_pedido: number;
  valor_total: number;
  signed_at: string | null;
  itens: Array<{
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
    produtos: { nome: string } | null;
  }>;
}

export default function AssinarComprovante() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSigning, setIsSigning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);

  useEffect(() => {
    if (token) {
      fetchReceipt();
    } else {
      setError('Token não fornecido');
      setIsLoading(false);
    }
  }, [token]);

  const fetchReceipt = async () => {
    try {
      const { data, error: fetchError } = await supabase.functions.invoke('sign-delivery-receipt', {
        method: 'GET',
        body: null,
        headers: {},
      });

      // Use direct fetch since we need GET with query params
      const response = await fetch(
        `https://uozxegxvjxmfjlitmmvx.supabase.co/functions/v1/sign-delivery-receipt?token=${token}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao carregar comprovante');
      }

      setReceipt(result.receipt);
    } catch (err: any) {
      console.error('Error fetching receipt:', err);
      setError(err.message || 'Erro ao carregar comprovante');
    } finally {
      setIsLoading(false);
    }
  };

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

  useEffect(() => {
    if (receipt && receipt.status !== 'signed') {
      setTimeout(initCanvas, 100);
    }
  }, [receipt]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
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
    e.preventDefault();
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

  const handleSign = async () => {
    if (!hasSignature || !token) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const signatureData = canvas.toDataURL('image/png');
    
    setIsSigning(true);
    try {
      const response = await fetch(
        'https://uozxegxvjxmfjlitmmvx.supabase.co/functions/v1/sign-delivery-receipt',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            signature_data: signatureData,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao assinar');
      }

      setIsSuccess(true);
    } catch (err: any) {
      console.error('Error signing:', err);
      setError(err.message || 'Erro ao assinar comprovante');
    } finally {
      setIsSigning(false);
    }
  };

  const formatEndereco = (endereco: any) => {
    if (!endereco) return '-';
    if (typeof endereco === 'string') return endereco;
    const parts = [];
    if (endereco.rua) parts.push(endereco.rua);
    if (endereco.numero) parts.push(endereco.numero);
    if (endereco.bairro) parts.push(endereco.bairro);
    if (endereco.cidade) parts.push(endereco.cidade);
    return parts.join(', ') || '-';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Carregando comprovante...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h1 className="text-xl font-semibold mb-2">Erro</h1>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isSuccess || receipt?.status === 'signed') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-emerald-600" />
            </div>
            <h1 className="text-xl font-semibold mb-2">Comprovante Assinado!</h1>
            <p className="text-muted-foreground">
              O comprovante de entrega foi assinado com sucesso.
              {receipt?.signed_at && (
                <span className="block mt-2 text-sm">
                  Assinado em: {new Date(receipt.signed_at).toLocaleString('pt-BR')}
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold">TAUBATÉ CHOPP</h1>
              <p className="text-sm text-muted-foreground">(12) 3432-6712 / 99109-2301</p>
              <p className="text-sm text-muted-foreground">www.choppemtaubate.com.br</p>
            </div>
            <Separator className="my-4" />
            <div className="text-center">
              <span className="text-lg font-semibold">
                Pedido #{receipt?.numero_pedido}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Client Info */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-3">Dados do Cliente</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Nome:</span>
                <p className="font-medium">{receipt?.cliente_nome || '-'}</p>
              </div>
              <div>
                <span className="text-muted-foreground">CPF/CNPJ:</span>
                <p className="font-medium">{receipt?.cliente_cpf_cnpj || '-'}</p>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Endereço:</span>
                <p className="font-medium">{formatEndereco(receipt?.cliente_endereco)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-3">Itens do Pedido</h2>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Qtd</th>
                    <th className="p-2 text-left">Produto</th>
                    <th className="p-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {receipt?.itens.map((item, idx) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{item.quantidade}</td>
                      <td className="p-2">{item.produtos?.nome || 'Produto'}</td>
                      <td className="p-2 text-right">R$ {item.subtotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-right">
              <span className="text-lg font-bold">
                Total: R$ {receipt?.valor_total?.toFixed(2)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Signature */}
        <Card className="mb-4">
          <CardContent className="pt-6">
            <h2 className="font-semibold mb-3">Assinatura do Cliente</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Assine abaixo para confirmar o recebimento da entrega
            </p>
            
            <div className="relative">
              <canvas
                ref={canvasRef}
                width={500}
                height={200}
                className="w-full border rounded-lg bg-white touch-none"
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onTouchStart={startDrawing}
                onTouchMove={draw}
                onTouchEnd={stopDrawing}
              />
              {!hasSignature && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-muted-foreground">Assine aqui</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-4">
              <Button
                variant="outline"
                onClick={clearSignature}
                className="flex-1"
              >
                <Eraser className="h-4 w-4 mr-2" />
                Limpar
              </Button>
              <Button
                onClick={handleSign}
                disabled={!hasSignature || isSigning}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700"
              >
                {isSigning ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Confirmar Assinatura
              </Button>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Ao assinar, você confirma o recebimento dos produtos listados acima.
        </p>
      </div>
    </div>
  );
}
