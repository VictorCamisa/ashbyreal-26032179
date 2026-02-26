import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  User,
  Phone,
  Package,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  Copy,
  Printer,
  RotateCcw,
  MessageCircle,
  DollarSign,
  Link2,
  ExternalLink,
  Trash2,
  Undo2,
  Receipt,
  Loader2,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { PedidoStatusWorkflow } from './PedidoStatusWorkflow';
import { usePedidosMutations } from '@/hooks/usePedidosMutations';
import { RegistrarDevolucaoDialog } from './RegistrarDevolucaoDialog';
import { ValidarDadosEmissaoDialog } from '@/components/contabilidade/ValidarDadosEmissaoDialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface DetalhesPedidoDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoId: string | null;
  clienteNome?: string;
  onStatusChange?: () => void;
  onDelete?: () => void;
}

interface PedidoDetails {
  id: string;
  numero_pedido: number;
  cliente_id: string;
  status: string;
  valor_total: number;
  valor_sinal: number;
  data_pedido: string;
  data_entrega: string | null;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  observacoes: string | null;
  status_history: any[];
  transaction_id: string | null;
}

interface PedidoItem {
  id: string;
  produto_id: string;
  quantidade: number;
  preco_unitario: number;
  subtotal: number;
  quantidade_devolvida: number;
  valor_devolvido: number;
  produtos: {
    nome: string;
    categoria: string | null;
    sku: string | null;
  } | null;
}

interface Cliente {
  nome: string;
  telefone: string;
  email: string;
}

interface TransactionInfo {
  id: string;
  status: string;
  amount: number;
}

const statusIcons: Record<string, React.ElementType> = {
  pendente: Clock,
  pago: CreditCard,
  entregue: CheckCircle,
  cancelado: XCircle,
};

const statusColors: Record<string, string> = {
  pendente: 'bg-amber-500',
  pago: 'bg-emerald-500',
  entregue: 'bg-blue-500',
  cancelado: 'bg-red-500',
};

export function DetalhesPedidoDrawer({
  open,
  onOpenChange,
  pedidoId,
  clienteNome,
  onStatusChange,
  onDelete,
}: DetalhesPedidoDrawerProps) {
  const [pedido, setPedido] = useState<PedidoDetails | null>(null);
  const [items, setItems] = useState<PedidoItem[]>([]);
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [transaction, setTransaction] = useState<TransactionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDevolucao, setShowDevolucao] = useState(false);
  const [isEmittingCupom, setIsEmittingCupom] = useState(false);
  const [showValidacao, setShowValidacao] = useState(false);
  const { toast } = useToast();
  const { deletePedido, isLoading: isDeleting } = usePedidosMutations();

  // Calculate total returns
  const totalDevolvido = items.reduce((acc, item) => acc + (item.valor_devolvido || 0), 0);
  const hasDevoluções = items.some(item => (item.quantidade_devolvida || 0) > 0);

  useEffect(() => {
    if (open && pedidoId) {
      fetchPedidoDetails();
    }
  }, [open, pedidoId]);

  const handleDelete = async () => {
    if (!pedidoId) return;
    try {
      await deletePedido(pedidoId);
      onOpenChange(false);
      onDelete?.();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const fetchPedidoDetails = async () => {
    if (!pedidoId) return;
    setIsLoading(true);

    try {
      // Fetch pedido
      const { data: pedidoData, error: pedidoError } = await supabase
        .from('pedidos')
        .select('*')
        .eq('id', pedidoId)
        .single();

      if (pedidoError) throw pedidoError;

      // Parse status_history safely
      let statusHistory: any[] = [];
      if (pedidoData.status_history) {
        try {
          statusHistory = typeof pedidoData.status_history === 'string'
            ? JSON.parse(pedidoData.status_history)
            : pedidoData.status_history;
        } catch {
          statusHistory = [];
        }
      }

      setPedido({ 
        ...pedidoData, 
        status_history: statusHistory,
        valor_sinal: pedidoData.valor_sinal || 0
      });

      // Fetch items with products
      const { data: itemsData } = await supabase
        .from('pedido_itens')
        .select(`
          *,
          produtos (nome, categoria, sku)
        `)
        .eq('pedido_id', pedidoId);

      setItems((itemsData || []).map(item => ({
        ...item,
        quantidade_devolvida: item.quantidade_devolvida || 0,
        valor_devolvido: item.valor_devolvido || 0
      })));

      // Fetch cliente
      if (pedidoData.cliente_id) {
        const { data: clienteData } = await supabase
          .from('clientes')
          .select('nome, telefone, email')
          .eq('id', pedidoData.cliente_id)
          .single();

        setCliente(clienteData);
      }

      // Fetch transaction if linked
      if (pedidoData.transaction_id) {
        const { data: transactionData } = await supabase
          .from('transactions')
          .select('id, status, amount')
          .eq('id', pedidoData.transaction_id)
          .single();

        setTransaction(transactionData);
      } else {
        setTransaction(null);
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyId = () => {
    if (pedido?.numero_pedido) {
      navigator.clipboard.writeText(String(pedido.numero_pedido));
      toast({ title: 'Copiado!', description: 'Número do pedido copiado.' });
    }
  };

  const handleWhatsApp = () => {
    if (cliente?.telefone && pedido) {
      const phone = cliente.telefone.replace(/\D/g, '');
      const message = encodeURIComponent(
        `Olá ${cliente.nome}! Seu pedido #${pedido.numero_pedido} está ${pedido.status}. Valor: R$ ${pedido.valor_total.toFixed(2)}`
      );
      window.open(`https://wa.me/55${phone}?text=${message}`, '_blank');
    }
  };

  const handleEmitirCupomClick = () => {
    if (!pedido || !pedidoId) return;
    // Show validation dialog before emitting
    setShowValidacao(true);
  };

  const handleEmitirCupom = async () => {
    if (!pedido || !pedidoId) return;
    setIsEmittingCupom(true);
    try {
      // 1. Create documento fiscal (NFC-e) from pedido
      const itensParaDoc = items.map(item => ({
        descricao: item.produtos?.nome || 'Produto',
        codigo: item.produtos?.sku || undefined,
        quantidade: item.quantidade,
        valor_unitario: item.preco_unitario,
        valor_total: item.subtotal,
        unidade: 'UN',
        ncm: '22030000',
        cfop: '5102',
      }));

      const { data: doc, error: docErr } = await supabase
        .from('documentos_fiscais')
        .insert({
          tipo: 'NFCE' as any,
          direcao: 'SAIDA' as any,
          status: 'RASCUNHO' as any,
          pedido_id: pedidoId,
          cliente_id: pedido.cliente_id,
          natureza_operacao: 'Venda de mercadoria',
          valor_produtos: pedido.valor_total,
          valor_total: pedido.valor_total,
          valor_servicos: 0,
          valor_desconto: 0,
          valor_frete: 0,
          valor_outras: 0,
        })
        .select()
        .single();

      if (docErr) throw docErr;

      // 2. Insert items
      if (itensParaDoc.length > 0) {
        const { error: itensErr } = await supabase
          .from('documento_fiscal_itens')
          .insert(itensParaDoc.map(item => ({
            ...item,
            documento_id: doc.id,
          })));
        if (itensErr) throw itensErr;
      } else {
        throw new Error('Pedido não possui itens para emitir nota fiscal.');
      }

      // Small delay to ensure items are committed before edge function reads them
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Emit via Focus NFe
      const { data: focusData, error: focusErr } = await supabase.functions.invoke('focus-nfe', {
        body: { action: 'emitir_nfce', documento_id: doc.id, ambiente: 'PRODUCAO' },
      });

      if (focusErr) throw new Error(focusErr.message);
      if (focusData && !focusData.success) throw new Error(focusData.error);

      toast({ 
          title: '🧾 Cupom Fiscal emitido!', 
          description: focusData?.chave_nfe ? `Chave: ${focusData.chave_nfe.substring(0, 20)}...` : 'NFC-e processada com sucesso.'
      });

      if (focusData?.danfe_url) {
        window.open(focusData.danfe_url, '_blank');
      }
    } catch (error: any) {
      console.error('Erro ao emitir cupom:', error);
      toast({ 
        title: 'Erro ao emitir cupom fiscal', 
        description: error.message || 'Tente novamente',
        variant: 'destructive' 
      });
    } finally {
      setIsEmittingCupom(false);
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle className="text-xl">
                Pedido #{pedido?.numero_pedido || pedidoId?.slice(0, 8)}
              </SheetTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {formatDate(pedido?.data_pedido || null)}
              </p>
            </div>
            {pedido && (
              <PedidoStatusWorkflow
                pedidoId={pedido.id}
                currentStatus={pedido.status}
                statusHistory={pedido.status_history}
                onStatusChange={() => {
                  fetchPedidoDetails();
                  onStatusChange?.();
                }}
              />
            )}
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="flex-1 p-6 space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              {/* Cliente Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Cliente
                </h3>
                <div className="p-4 bg-muted/30 rounded-lg space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{cliente?.nome || clienteNome || '-'}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {cliente?.telefone || '-'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Itens do Pedido
                </h3>
                {items.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                    Nenhum item registrado
                  </p>
                ) : (
                  <div className="space-y-2">
                    {items.map((item) => {
                      const devolvido = item.quantidade_devolvida || 0;
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center">
                              <Package className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">
                                  {item.produtos?.nome || 'Produto'}
                                </p>
                                {devolvido > 0 && (
                                  <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-600 border-amber-500/20">
                                    {devolvido} devolvido
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {item.quantidade}x R$ {item.preco_unitario.toFixed(2)}
                                {devolvido > 0 && (
                                  <span className="text-amber-600 ml-2">
                                    (Estorno: R$ {item.valor_devolvido.toFixed(2)})
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <span className="font-semibold text-primary">
                            R$ {item.subtotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Payment Info */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Pagamento
                </h3>
                <div className="p-4 bg-muted/30 rounded-lg space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valor Original</span>
                    <span>R$ {pedido?.valor_total.toFixed(2)}</span>
                  </div>
                  {pedido && pedido.valor_sinal > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3 w-3" />
                        Sinal pago
                      </span>
                      <span>- R$ {pedido.valor_sinal.toFixed(2)}</span>
                    </div>
                  )}
                  {totalDevolvido > 0 && (
                    <div className="flex justify-between text-amber-600 dark:text-amber-400">
                      <span className="flex items-center gap-1">
                        <Undo2 className="h-3 w-3" />
                        Estornos (devoluções)
                      </span>
                      <span>- R$ {totalDevolvido.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total Líquido</span>
                    <span className="text-primary">
                      R$ {((pedido?.valor_total || 0) - (pedido?.valor_sinal || 0) - totalDevolvido).toFixed(2)}
                    </span>
                  </div>
                  {pedido?.metodo_pagamento && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Método</span>
                      <Badge variant="outline" className="capitalize">
                        {pedido.metodo_pagamento}
                      </Badge>
                    </div>
                  )}
                  {pedido?.data_pagamento && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Pago em</span>
                      <span>{formatDate(pedido.data_pagamento)}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Integration */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  Integração Financeira
                </h3>
                <div className="p-4 bg-muted/30 rounded-lg">
                  {transaction ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Transação Vinculada</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Badge 
                              variant="outline" 
                              className={cn(
                                'text-xs',
                                transaction.status === 'PAGO' && 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
                                transaction.status === 'PREVISTO' && 'bg-amber-500/10 text-amber-500 border-amber-500/20',
                                transaction.status === 'CANCELADO' && 'bg-red-500/10 text-red-500 border-red-500/20'
                              )}
                            >
                              {transaction.status}
                            </Badge>
                            <span>R$ {Number(transaction.amount).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open('/financeiro', '_blank')}
                        className="gap-1"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <Link2 className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">Sem Transação</p>
                          <p className="text-xs text-muted-foreground">
                            {pedido?.status === 'pago' 
                              ? 'Transação será criada automaticamente'
                              : 'Marque como pago para gerar transação'}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Timeline */}
              {pedido?.status_history && pedido.status_history.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Histórico
                  </h3>
                  <div className="space-y-0">
                    {pedido.status_history.map((event, index) => {
                      const Icon = statusIcons[event.status] || Clock;
                      const isLast = index === pedido.status_history.length - 1;
                      return (
                        <div key={index} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center',
                                statusColors[event.status] || 'bg-muted'
                              )}
                            >
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            {!isLast && (
                              <div className="w-0.5 h-8 bg-border" />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className="font-medium capitalize">{event.status}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(event.timestamp)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {pedido?.observacoes && (
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                    Observações
                  </h3>
                  <p className="text-sm p-4 bg-muted/30 rounded-lg">
                    {pedido.observacoes}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        )}

        {/* Quick Actions */}
        <div className="p-4 border-t bg-muted/20 space-y-3">
          {/* Emitir Cupom - Destaque */}
          {pedido && (pedido.status === 'pago' || pedido.status === 'entregue') && (
            <Button
              onClick={handleEmitirCupomClick}
              disabled={isEmittingCupom}
              className="w-full gap-2"
              size="sm"
            >
              {isEmittingCupom ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Receipt className="h-4 w-4" />
              )}
              {isEmittingCupom ? 'Emitindo Cupom...' : 'Emitir Cupom Fiscal (NFC-e)'}
            </Button>
          )}

          <div className="grid grid-cols-4 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopyId}
              className="flex-col h-auto py-3 gap-1"
            >
              <Copy className="h-4 w-4" />
              <span className="text-xs">Copiar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleWhatsApp}
              className="flex-col h-auto py-3 gap-1"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">WhatsApp</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-col h-auto py-3 gap-1"
            >
              <Printer className="h-4 w-4" />
              <span className="text-xs">Imprimir</span>
            </Button>
            {pedido?.status === 'entregue' && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDevolucao(true)}
                className="flex-col h-auto py-3 gap-1 text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
              >
                <Undo2 className="h-4 w-4" />
                <span className="text-xs">Devolução</span>
              </Button>
            )}
            {pedido?.status !== 'entregue' && (
              <Button
                variant="outline"
                size="sm"
                className="flex-col h-auto py-3 gap-1"
              >
                <RotateCcw className="h-4 w-4" />
                <span className="text-xs">Duplicar</span>
              </Button>
            )}
          </div>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                size="sm"
                className="w-full gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Excluir Pedido
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir Pedido</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir o pedido #{pedido?.numero_pedido ? String(pedido.numero_pedido).slice(-8) : ''}? 
                  Esta ação irá:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Restaurar o estoque dos produtos</li>
                    <li>Cancelar a transação financeira vinculada</li>
                    <li>Remover permanentemente o pedido</li>
                  </ul>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        {/* Devolução Dialog */}
        {pedidoId && (
          <RegistrarDevolucaoDialog
            open={showDevolucao}
            onOpenChange={setShowDevolucao}
            pedidoId={pedidoId}
            onSuccess={() => {
              fetchPedidoDetails();
              onStatusChange?.();
            }}
          />
        )}

        {/* Validação pré-emissão */}
        <ValidarDadosEmissaoDialog
          open={showValidacao}
          onOpenChange={setShowValidacao}
          tipo="NFCE"
          clienteId={pedido?.cliente_id}
          onValidated={() => {
            setShowValidacao(false);
            handleEmitirCupom();
          }}
        />
      </SheetContent>
    </Sheet>
  );
}
