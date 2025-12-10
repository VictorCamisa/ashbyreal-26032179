import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
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
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Search,
  Package,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Receipt,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePedidosMutations, CartItem } from '@/hooks/usePedidosMutations';
import { cn } from '@/lib/utils';

interface NovoPedidoCompletoDialogProps {
  onSuccess?: () => void;
}

interface Produto {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  categoria: string | null;
  sku: string | null;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string;
}

const metodoPagamentoOptions = [
  { value: 'pix', label: 'PIX', icon: Smartphone },
  { value: 'cartao', label: 'Cartão', icon: CreditCard },
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'boleto', label: 'Boleto', icon: Receipt },
];

export function NovoPedidoCompletoDialog({ onSuccess }: NovoPedidoCompletoDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'cliente' | 'produtos' | 'pagamento'>('cliente');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchProduto, setSearchProduto] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [metodoPagamento, setMetodoPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');

  const { createPedido, isLoading } = usePedidosMutations();

  useEffect(() => {
    if (open) {
      fetchClientes();
      fetchProdutos();
    }
  }, [open]);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, telefone')
      .order('nome');
    setClientes(data || []);
  };

  const fetchProdutos = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, preco, estoque, categoria, sku')
      .eq('ativo', true)
      .gt('estoque', 0)
      .order('nome');
    setProdutos(data || []);
  };

  const filteredProdutos = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(searchProduto.toLowerCase()) ||
      p.sku?.toLowerCase().includes(searchProduto.toLowerCase()) ||
      p.categoria?.toLowerCase().includes(searchProduto.toLowerCase())
  );

  const filteredClientes = clientes.filter(
    (c) =>
      c.nome.toLowerCase().includes(searchCliente.toLowerCase()) ||
      c.telefone.includes(searchCliente)
  );

  const addToCart = (produto: Produto) => {
    const existing = cart.find((item) => item.produtoId === produto.id);
    if (existing) {
      if (existing.quantidade < produto.estoque) {
        setCart(
          cart.map((item) =>
            item.produtoId === produto.id
              ? { ...item, quantidade: item.quantidade + 1 }
              : item
          )
        );
      }
    } else {
      setCart([
        ...cart,
        {
          produtoId: produto.id,
          nome: produto.nome,
          quantidade: 1,
          precoUnitario: produto.preco,
          estoque: produto.estoque,
        },
      ]);
    }
  };

  const updateQuantity = (produtoId: string, delta: number) => {
    setCart(
      cart
        .map((item) => {
          if (item.produtoId === produtoId) {
            const newQty = item.quantidade + delta;
            if (newQty <= 0) return null;
            if (newQty > item.estoque) return item;
            return { ...item, quantidade: newQty };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (produtoId: string) => {
    setCart(cart.filter((item) => item.produtoId !== produtoId));
  };

  const totalValue = cart.reduce(
    (acc, item) => acc + item.quantidade * item.precoUnitario,
    0
  );

  const totalItems = cart.reduce((acc, item) => acc + item.quantidade, 0);

  const handleSubmit = async () => {
    if (!selectedCliente || cart.length === 0) return;

    try {
      await createPedido({
        clienteId: selectedCliente.id,
        items: cart,
        metodoPagamento,
        observacoes,
        dataEntrega,
      });

      // Reset state
      setOpen(false);
      setStep('cliente');
      setSelectedCliente(null);
      setCart([]);
      setMetodoPagamento('');
      setObservacoes('');
      setDataEntrega('');
      setSearchProduto('');
      setSearchCliente('');

      onSuccess?.();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const resetDialog = () => {
    setStep('cliente');
    setSelectedCliente(null);
    setCart([]);
    setMetodoPagamento('');
    setObservacoes('');
    setDataEntrega('');
    setSearchProduto('');
    setSearchCliente('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) resetDialog();
      }}
    >
      <DialogTrigger asChild>
        <Button size="lg" className="gap-2">
          <ShoppingCart className="h-5 w-5" />
          Nova Venda
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle className="text-xl">
            {step === 'cliente' && 'Selecionar Cliente'}
            {step === 'produtos' && 'Adicionar Produtos'}
            {step === 'pagamento' && 'Finalizar Pedido'}
          </DialogTitle>
          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {['cliente', 'produtos', 'pagamento'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={cn(
                    'w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors',
                    step === s
                      ? 'bg-primary text-primary-foreground'
                      : i < ['cliente', 'produtos', 'pagamento'].indexOf(step)
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div
                    className={cn(
                      'w-12 h-1 mx-1 rounded',
                      i < ['cliente', 'produtos', 'pagamento'].indexOf(step)
                        ? 'bg-primary/50'
                        : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden px-6">
          {/* Step 1: Cliente */}
          {step === 'cliente' && (
            <div className="space-y-4 h-full flex flex-col">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nome ou telefone..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ScrollArea className="flex-1">
                <div className="grid gap-2 pr-4">
                  {filteredClientes.map((cliente) => (
                    <button
                      key={cliente.id}
                      onClick={() => {
                        setSelectedCliente(cliente);
                        setStep('produtos');
                      }}
                      className={cn(
                        'w-full p-4 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-muted/50',
                        selectedCliente?.id === cliente.id &&
                          'border-primary bg-primary/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{cliente.nome}</p>
                          <p className="text-sm text-muted-foreground">
                            {cliente.telefone}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredClientes.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">
                      Nenhum cliente encontrado
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Step 2: Produtos */}
          {step === 'produtos' && (
            <div className="grid grid-cols-5 gap-4 h-full">
              {/* Products List */}
              <div className="col-span-3 flex flex-col h-full">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={searchProduto}
                    onChange={(e) => setSearchProduto(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <ScrollArea className="flex-1">
                  <div className="grid grid-cols-2 gap-2 pr-4">
                    {filteredProdutos.map((produto) => {
                      const inCart = cart.find((c) => c.produtoId === produto.id);
                      return (
                        <button
                          key={produto.id}
                          onClick={() => addToCart(produto)}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-muted/30',
                            inCart && 'border-primary bg-primary/5'
                          )}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {produto.nome}
                              </p>
                              {produto.categoria && (
                                <Badge variant="secondary" className="text-xs mt-1">
                                  {produto.categoria}
                                </Badge>
                              )}
                            </div>
                            {inCart && (
                              <Badge className="shrink-0">{inCart.quantidade}</Badge>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-primary font-semibold">
                              R$ {produto.preco.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Est: {produto.estoque}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Cart */}
              <div className="col-span-2 flex flex-col bg-muted/30 rounded-lg p-4 h-full">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Carrinho
                  </h3>
                  <Badge variant="outline">{totalItems} itens</Badge>
                </div>
                <Separator className="mb-3" />
                <ScrollArea className="flex-1">
                  {cart.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Carrinho vazio</p>
                    </div>
                  ) : (
                    <div className="space-y-2 pr-2">
                      {cart.map((item) => (
                        <div
                          key={item.produtoId}
                          className="flex items-center gap-2 p-2 bg-background rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              R$ {item.precoUnitario.toFixed(2)} x {item.quantidade}
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.produtoId, -1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-medium">
                              {item.quantidade}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.produtoId, 1)}
                              disabled={item.quantidade >= item.estoque}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-destructive hover:text-destructive"
                              onClick={() => removeFromCart(item.produtoId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>R$ {totalValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">R$ {totalValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Pagamento */}
          {step === 'pagamento' && (
            <div className="space-y-6">
              {/* Summary */}
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{selectedCliente?.nome}</span>
                  </div>
                  <Badge variant="outline">{totalItems} itens</Badge>
                </div>
                <div className="text-2xl font-bold text-primary">
                  R$ {totalValue.toFixed(2)}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-3">
                <Label>Método de Pagamento</Label>
                <div className="grid grid-cols-4 gap-2">
                  {metodoPagamentoOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setMetodoPagamento(option.value)}
                      className={cn(
                        'p-4 rounded-lg border flex flex-col items-center gap-2 transition-all hover:border-primary/50',
                        metodoPagamento === option.value &&
                          'border-primary bg-primary/5'
                      )}
                    >
                      <option.icon className="h-5 w-5" />
                      <span className="text-sm font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Delivery Date */}
              <div className="space-y-2">
                <Label htmlFor="dataEntrega">Data de Entrega (opcional)</Label>
                <Input
                  id="dataEntrega"
                  type="date"
                  value={dataEntrega}
                  onChange={(e) => setDataEntrega(e.target.value)}
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={observacoes}
                  onChange={(e) => setObservacoes(e.target.value)}
                  placeholder="Observações sobre o pedido..."
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 'produtos') setStep('cliente');
              else if (step === 'pagamento') setStep('produtos');
              else setOpen(false);
            }}
          >
            {step === 'cliente' ? 'Cancelar' : 'Voltar'}
          </Button>

          {step === 'cliente' && selectedCliente && (
            <Button onClick={() => setStep('produtos')}>
              Continuar
            </Button>
          )}

          {step === 'produtos' && (
            <Button onClick={() => setStep('pagamento')} disabled={cart.length === 0}>
              Ir para Pagamento ({totalItems} itens)
            </Button>
          )}

          {step === 'pagamento' && (
            <Button
              onClick={handleSubmit}
              disabled={isLoading || !metodoPagamento}
              className="gap-2"
            >
              {isLoading ? (
                'Criando...'
              ) : (
                <>
                  <ShoppingCart className="h-4 w-4" />
                  Finalizar Pedido
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
