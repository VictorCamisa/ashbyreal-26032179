import { useState, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Printer, Check, Pencil, Send, Loader2, ExternalLink, RefreshCw, Clock, CheckCircle, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useBarrisMutations } from '@/hooks/useBarrisMutations';
import { SelecionarBarrisPedido } from './SelecionarBarrisPedido';

interface ComprovanteEntregaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string;
  onConfirm: () => void;
}

interface PedidoData {
  numero_pedido: string;
  valor_total: number;
  valor_sinal: number;
  observacoes: string | null;
  cliente_id: string | null;
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

interface DeliveryReceipt {
  id: string;
  token: string;
  status: 'pending' | 'sent' | 'signed';
  signed_at: string | null;
  sent_at: string | null;
  controle_barris?: any;
}

interface BarrilSelecionado {
  id: string;
  codigo: string;
  capacidade: number;
}

export function ComprovanteEntregaDialog({
  open,
  onOpenChange,
  pedidoId,
  onConfirm,
}: ComprovanteEntregaDialogProps) {
  const [pedidoData, setPedidoData] = useState<PedidoData | null>(null);
  const [receipt, setReceipt] = useState<DeliveryReceipt | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const { toast } = useToast();
  const { movimentarBarris } = useBarrisMutations();
  
  // Barris selecionados
  const [barrisEntrega, setBarrisEntrega] = useState<BarrilSelecionado[]>([]);
  const [barrisRetorno, setBarrisRetorno] = useState<BarrilSelecionado[]>([]);
  
  // Form state
  const [formData, setFormData] = useState({
    dataEntrega: new Date().toISOString().split('T')[0],
    periodoEntrega: 'integral',
    metodoPagamento: 'pix',
    observacoes: '',
    cpfCnpj: '',
    telefone: '',
  });

  useEffect(() => {
    if (open && pedidoId) {
      fetchPedidoData();
      fetchReceipt();
    }
  }, [open, pedidoId]);

  const fetchPedidoData = async () => {
    setIsLoading(true);
    try {
      const { data: pedido } = await supabase
        .from('pedidos')
        .select('numero_pedido, valor_total, valor_sinal, observacoes, cliente_id')
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
        valor_sinal: pedido.valor_sinal || 0,
        observacoes: pedido.observacoes,
        cliente_id: pedido.cliente_id,
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

  const fetchReceipt = async () => {
    try {
      const { data, error } = await supabase
        .from('delivery_receipts')
        .select('id, token, status, signed_at, sent_at, controle_barris')
        .eq('pedido_id', pedidoId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        setReceipt(data as DeliveryReceipt);
        
        // Carregar barris salvos no comprovante
        const controle = data.controle_barris as any;
        if (controle) {
          if (controle.barrisEntrega && Array.isArray(controle.barrisEntrega)) {
            setBarrisEntrega(controle.barrisEntrega);
          }
          if (controle.barrisRetorno && Array.isArray(controle.barrisRetorno)) {
            setBarrisRetorno(controle.barrisRetorno);
          }
        }
      } else {
        setReceipt(null);
      }
    } catch (error) {
      console.error('Error fetching receipt:', error);
    }
  };

  const handleSendReceipt = async () => {
    if (!pedidoData?.cliente?.telefone) {
      toast({
        title: 'Erro',
        description: 'Cliente não possui telefone cadastrado',
        variant: 'destructive',
      });
      return;
    }

    setIsSending(true);
    try {
      // Create or update delivery receipt
      const receiptData = {
        pedido_id: pedidoId,
        status: 'sent' as const,
        cliente_nome: pedidoData.cliente?.nome,
        cliente_telefone: formData.telefone || pedidoData.cliente?.telefone,
        cliente_cpf_cnpj: formData.cpfCnpj || pedidoData.cliente?.cpf_cnpj,
        cliente_endereco: pedidoData.cliente?.endereco,
        controle_barris: {
          barrisEntrega: barrisEntrega.map(b => ({ id: b.id, codigo: b.codigo, capacidade: b.capacidade })),
          barrisRetorno: barrisRetorno.map(b => ({ id: b.id, codigo: b.codigo, capacidade: b.capacidade })),
        },
        data_entrega: formData.dataEntrega,
        periodo_entrega: formData.periodoEntrega,
        metodo_pagamento: formData.metodoPagamento,
        observacoes: formData.observacoes,
        sent_at: new Date().toISOString(),
      };

      let receiptToken = receipt?.token;

      if (receipt) {
        // Update existing
        await supabase
          .from('delivery_receipts')
          .update(receiptData)
          .eq('id', receipt.id);
      } else {
        // Create new
        const { data: newReceipt, error } = await supabase
          .from('delivery_receipts')
          .insert(receiptData)
          .select('token')
          .single();
        
        if (error) throw error;
        receiptToken = newReceipt.token;
      }

      // Generate signature link
      const signatureUrl = `${window.location.origin}/assinar?token=${receiptToken}`;

      // Open WhatsApp with the link
      const phone = (formData.telefone || pedidoData.cliente?.telefone || '').replace(/\D/g, '');
      const message = encodeURIComponent(
        `Olá ${pedidoData.cliente?.nome}! 🍺\n\n` +
        `Segue o comprovante de entrega do Pedido #${pedidoData.numero_pedido}.\n\n` +
        `Por favor, assine digitalmente para confirmar o recebimento:\n` +
        `${signatureUrl}\n\n` +
        `Taubaté Chopp - Obrigado pela preferência!`
      );
      
      window.open(`https://wa.me/${phone}?text=${message}`, '_blank');

      toast({
        title: 'Link enviado!',
        description: 'O link de assinatura foi enviado para o cliente',
      });

      // Refresh receipt data
      await fetchReceipt();

    } catch (error) {
      console.error('Error sending receipt:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o comprovante',
        variant: 'destructive',
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleConfirmDelivery = async () => {
    if (receipt?.status !== 'signed') {
      toast({
        title: 'Aguardando assinatura',
        description: 'O cliente ainda não assinou o comprovante',
        variant: 'destructive',
      });
      return;
    }

    setIsConfirming(true);
    try {
      // Movimentar barris se houver barris selecionados
      if ((barrisEntrega.length > 0 || barrisRetorno.length > 0) && pedidoData?.cliente_id) {
        await movimentarBarris({
          pedidoId,
          clienteId: pedidoData.cliente_id,
          barrisEntrega: barrisEntrega.map(b => ({ barrilId: b.id, codigo: b.codigo })),
          barrisRetorno: barrisRetorno.map(b => ({ barrilId: b.id, codigo: b.codigo })),
        });
      }

      onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao confirmar entrega:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao movimentar barris, mas a entrega foi confirmada.',
        variant: 'destructive',
      });
      onConfirm();
      onOpenChange(false);
    } finally {
      setIsConfirming(false);
    }
  };

  const handlePrint = () => {
    window.print();
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

  const getSignatureUrl = () => {
    if (!receipt?.token) return '';
    return `${window.location.origin}/assinar?token=${receipt.token}`;
  };

  const copySignatureLink = () => {
    navigator.clipboard.writeText(getSignatureUrl());
    toast({
      title: 'Link copiado!',
      description: 'O link de assinatura foi copiado para a área de transferência',
    });
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

        {/* Status Banner */}
        {receipt && (
          <div className={cn(
            "flex items-center gap-3 p-3 rounded-lg print:hidden",
            receipt.status === 'signed' 
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
              : receipt.status === 'sent'
              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
              : "bg-muted"
          )}>
            {receipt.status === 'signed' ? (
              <>
                <CheckCircle className="h-5 w-5" />
                <div>
                  <p className="font-medium">Comprovante Assinado</p>
                  <p className="text-xs">
                    Assinado em: {new Date(receipt.signed_at!).toLocaleString('pt-BR')}
                  </p>
                </div>
              </>
            ) : receipt.status === 'sent' ? (
              <>
                <Clock className="h-5 w-5" />
                <div className="flex-1">
                  <p className="font-medium">Aguardando Assinatura</p>
                  <p className="text-xs">
                    Enviado em: {new Date(receipt.sent_at!).toLocaleString('pt-BR')}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={fetchReceipt}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Atualizar
                </Button>
              </>
            ) : (
              <p className="text-muted-foreground">Comprovante pendente de envio</p>
            )}
          </div>
        )}

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
            <div className="flex flex-col justify-end space-y-2">
              {/* Sinal info */}
              {pedidoData && pedidoData.valor_sinal > 0 && (
                <div className="border rounded-lg p-3 print:border-black bg-amber-500/10 border-amber-500/20">
                  <Label className="text-xs text-amber-600 dark:text-amber-400">SINAL PAGO</Label>
                  <p className="text-lg font-bold text-amber-600 dark:text-amber-400">
                    - R$ {pedidoData.valor_sinal.toFixed(2)}
                  </p>
                </div>
              )}
              {/* Total or Remaining */}
              <div className="border rounded-lg p-4 print:border-black">
                {pedidoData && pedidoData.valor_sinal > 0 ? (
                  <>
                    <Label className="text-xs text-muted-foreground">TOTAL A RECEBER NA ENTREGA</Label>
                    <p className="text-2xl font-bold text-primary print:text-black">
                      R$ {(pedidoData.valor_total - pedidoData.valor_sinal).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      (Total: R$ {pedidoData.valor_total.toFixed(2)})
                    </p>
                  </>
                ) : (
                  <>
                    <Label className="text-xs text-muted-foreground">TOTAL</Label>
                    <p className="text-2xl font-bold text-primary print:text-black">
                      R$ {pedidoData?.valor_total.toFixed(2)}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Controle de Barris - Seleção por código */}
          <div className="border rounded-lg p-4 print:border-black">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-4 w-4" />
              <h3 className="font-semibold">CONTROLE DE BARRIS</h3>
              {(barrisEntrega.length > 0 || barrisRetorno.length > 0) && (
                <Badge variant="secondary" className="ml-auto">
                  {barrisEntrega.length} entrega / {barrisRetorno.length} retorno
                </Badge>
              )}
            </div>
            
            <SelecionarBarrisPedido
              clienteId={pedidoData?.cliente_id || null}
              barrisEntrega={barrisEntrega}
              barrisRetorno={barrisRetorno}
              onBarrisEntregaChange={setBarrisEntrega}
              onBarrisRetornoChange={setBarrisRetorno}
              disabled={receipt?.status === 'signed'}
            />

            {/* Resumo para impressão */}
            <div className="hidden print:block mt-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-medium">Barris Entregues (Cheios):</p>
                  <p>{barrisEntrega.map(b => `${b.codigo} (${b.capacidade}L)`).join(', ') || 'Nenhum'}</p>
                </div>
                <div>
                  <p className="font-medium">Barris Retirados (Vazios):</p>
                  <p>{barrisRetorno.map(b => `${b.codigo} (${b.capacidade}L)`).join(', ') || 'Nenhum'}</p>
                </div>
              </div>
            </div>
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

          {/* Link de assinatura (se enviado) */}
          {receipt && receipt.status !== 'pending' && (
            <div className="border rounded-lg p-4 print:hidden">
              <Label className="text-xs text-muted-foreground">Link de Assinatura</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value={getSignatureUrl()} 
                  readOnly 
                  className="text-xs font-mono"
                />
                <Button variant="outline" size="sm" onClick={copySignatureLink}>
                  Copiar
                </Button>
                <Button variant="outline" size="sm" onClick={() => window.open(getSignatureUrl(), '_blank')}>
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
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
          
          {receipt?.status !== 'signed' ? (
            <Button onClick={handleSendReceipt} disabled={isSending}>
              {isSending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              {receipt?.status === 'sent' ? 'Reenviar para Assinar' : 'Enviar para Assinar'}
            </Button>
          ) : (
            <Button 
              className="bg-emerald-600 hover:bg-emerald-700"
              onClick={handleConfirmDelivery}
              disabled={isConfirming}
            >
              {isConfirming ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              {isConfirming ? 'Confirmando...' : 'Confirmar Entrega'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
