import { useState, useEffect, useMemo } from 'react';
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
  ArrowLeft,
  ArrowRight,
  Check,
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

  const filteredProdutos = useMemo(() => {
    if (!searchProduto) return produtos;
    const search = searchProduto.toLowerCase();
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(search) ||
        p.sku?.toLowerCase().includes(search) ||
        p.categoria?.toLowerCase().includes(search)
    );
  }, [produtos, searchProduto]);

  const filteredClientes = useMemo(() => {
    if (!searchCliente) return clientes;
    const search = searchCliente.toLowerCase();
    return clientes.filter(
      (c) =>
        c.nome.toLowerCase().includes(search) ||
        c.telefone.includes(searchCliente)
    );
  }, [clientes, searchCliente]);

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

      resetDialog();
      setOpen(false);
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

  const stepIndex = ['cliente', 'produtos', 'pagamento'].indexOf(step);

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
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header with Steps */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Nova Venda
            </DialogTitle>
            <div className="flex items-center gap-1">
              {['Cliente', 'Produtos', 'Pagamento'].map((label, i) => (
                <div key={label} className="flex items-center">
                  <button
                    onClick={() => {
                      if (i === 0) setStep('cliente');
                      else if (i === 1 && selectedCliente) setStep('produtos');
                      else if (i === 2 && cart.length > 0) setStep('pagamento');
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm transition-colors',
                      i === stepIndex
                        ? 'bg-primary text-primary-foreground'
                        : i < stepIndex
                        ? 'bg-primary/20 text-primary'
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    <span className="w-5 h-5 rounded-full bg-current/20 flex items-center justify-center text-xs font-medium">
                      {i < stepIndex ? <Check className="h-3 w-3" /> : i + 1}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                  {i < 2 && <div className="w-6 h-px bg-border mx-1" />}
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {/* Step 1: Cliente */}
          {step === 'cliente' && (
            <div className="h-full flex flex-col p-6">
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nome ou telefone..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  className="pl-10 h-11"
                  autoFocus
                />
              </div>
              <ScrollArea className="flex-1 -mx-2 px-2">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {filteredClientes.map((cliente) => (
                    <button
                      key={cliente.id}
                      onClick={() => {
                        setSelectedCliente(cliente);
                        setStep('produtos');
                      }}
                      className={cn(
                        'p-4 rounded-xl border text-left transition-all hover:border-primary/50 hover:bg-muted/50',
                        selectedCliente?.id === cliente.id &&
                          'border-primary bg-primary/5 ring-2 ring-primary/20'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium truncate">{cliente.nome}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {cliente.telefone}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))}
                  {filteredClientes.length === 0 && (
                    <div className="col-span-full text-center text-muted-foreground py-12">
                      <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Nenhum cliente encontrado</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Step 2: Produtos */}
          {step === 'produtos' && (
            <div className="h-full flex">
              {/* Products Grid */}
              <div className="flex-1 flex flex-col p-4 border-r">
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produto..."
                    value={searchProduto}
                    onChange={(e) => setSearchProduto(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
                <ScrollArea className="flex-1">
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 pr-2">
                    {filteredProdutos.map((produto) => {
                      const inCart = cart.find((c) => c.produtoId === produto.id);
                      return (
                        <button
                          key={produto.id}
                          onClick={() => addToCart(produto)}
                          className={cn(
                            'p-3 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-muted/30 relative',
                            inCart && 'border-primary bg-primary/5'
                          )}
                        >
                          {inCart && (
                            <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center">
                              {inCart.quantidade}
                            </Badge>
                          )}
                          <p className="font-medium text-sm truncate pr-4">
                            {produto.nome}
                          </p>
                          {produto.categoria && (
                            <Badge variant="secondary" className="text-xs mt-1.5">
                              {produto.categoria}
                            </Badge>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <span className="text-primary font-bold">
                              R$ {produto.preco.toFixed(2)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {produto.estoque} un
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {/* Cart Sidebar */}
              <div className="w-80 flex flex-col bg-muted/20">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold flex items-center gap-2">
                      <ShoppingCart className="h-4 w-4" />
                      Carrinho
                    </h3>
                    <Badge variant="outline">{totalItems}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {selectedCliente?.nome}
                  </p>
                </div>

                <ScrollArea className="flex-1 p-4">
                  {cart.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Package className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Carrinho vazio</p>
                      <p className="text-xs mt-1">Clique nos produtos para adicionar</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div
                          key={item.produtoId}
                          className="flex items-center gap-2 p-3 bg-background rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.nome}</p>
                            <p className="text-xs text-primary font-semibold">
                              R$ {(item.precoUnitario * item.quantidade).toFixed(2)}
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

                <div className="p-4 border-t bg-background">
                  <div className="flex justify-between text-lg font-bold mb-3">
                    <span>Total</span>
                    <span className="text-primary">R$ {totalValue.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Pagamento */}
          {step === 'pagamento' && (
            <ScrollArea className="h-full">
              <div className="p-6 max-w-2xl mx-auto space-y-6">
                {/* Summary */}
                <div className="p-5 bg-muted/30 rounded-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedCliente?.nome}</p>
                        <p className="text-sm text-muted-foreground">
                          {totalItems} {totalItems === 1 ? 'item' : 'itens'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Total</p>
                      <p className="text-2xl font-bold text-primary">
                        R$ {totalValue.toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <div className="space-y-1.5 text-sm">
                    {cart.map((item) => (
                      <div key={item.produtoId} className="flex justify-between">
                        <span className="text-muted-foreground">
                          {item.quantidade}x {item.nome}
                        </span>
                        <span>R$ {(item.quantidade * item.precoUnitario).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label className="text-base">Forma de Pagamento</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {metodoPagamentoOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => setMetodoPagamento(option.value)}
                        className={cn(
                          'p-4 rounded-xl border flex flex-col items-center gap-2 transition-all hover:border-primary/50',
                          metodoPagamento === option.value &&
                            'border-primary bg-primary/5 ring-2 ring-primary/20'
                        )}
                      >
                        <option.icon className="h-6 w-6" />
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
                    className="max-w-xs"
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
            </ScrollArea>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-between shrink-0 bg-background">
          <Button
            variant="outline"
            onClick={() => {
              if (step === 'produtos') setStep('cliente');
              else if (step === 'pagamento') setStep('produtos');
              else setOpen(false);
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 'cliente' ? 'Cancelar' : 'Voltar'}
          </Button>

          <div className="flex items-center gap-3">
            {step === 'produtos' && (
              <span className="text-sm text-muted-foreground">
                Total: <span className="font-bold text-foreground">R$ {totalValue.toFixed(2)}</span>
              </span>
            )}

            {step === 'cliente' && selectedCliente && (
              <Button onClick={() => setStep('produtos')} className="gap-2">
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {step === 'produtos' && (
              <Button
                onClick={() => setStep('pagamento')}
                disabled={cart.length === 0}
                className="gap-2"
              >
                Pagamento
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {step === 'pagamento' && (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !metodoPagamento}
                size="lg"
                className="gap-2 px-8"
              >
                {isLoading ? (
                  'Finalizando...'
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Finalizar Venda
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
