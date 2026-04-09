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
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  Circle,
  Store,
  Eye,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePedidosMutations, CartItem } from '@/hooks/usePedidosMutations';
import { useBarrisMutations } from '@/hooks/useBarrisMutations';
import { useLojistas } from '@/hooks/useLojistas';
import { SelecionarBarrisStep } from '@/components/barris/SelecionarBarrisStep';
import { LojistaDetailsSheet } from '@/components/lojistas/LojistaDetailsSheet';
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
  cpf_cnpj: string | null;
}

const metodoPagamentoOptions = [
  { value: 'pix', label: 'PIX', icon: Smartphone },
  { value: 'cartao', label: 'Cartão', icon: CreditCard },
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'boleto', label: 'Boleto', icon: Receipt },
];

// Helper to check if it's a CNPJ (14 digits)
const isCNPJ = (cpfCnpj: string | null): boolean => {
  if (!cpfCnpj) return false;
  const numbers = cpfCnpj.replace(/\D/g, '');
  return numbers.length === 14;
};

type Step = 'cliente' | 'produtos' | 'barris' | 'pagamento';

export function NovoPedidoCompletoDialog({ onSuccess }: NovoPedidoCompletoDialogProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('cliente');
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [searchProduto, setSearchProduto] = useState('');
  const [searchCliente, setSearchCliente] = useState('');
  const [selectedCliente, setSelectedCliente] = useState<Cliente | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [metodoPagamento, setMetodoPagamento] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [dataEntrega, setDataEntrega] = useState('');
  const [horarioEntrega, setHorarioEntrega] = useState('');
  const [enderecoEntrega, setEnderecoEntrega] = useState({
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
  });
  const [valorSinal, setValorSinal] = useState<number>(0);
  
  // Lojista state
  const [isVendaLojista, setIsVendaLojista] = useState(false);
  const [selectedLojistaId, setSelectedLojistaId] = useState<string | null>(null);
  const [lojistaSheetOpen, setLojistaSheetOpen] = useState(false);
  const [linkingLojista, setLinkingLojista] = useState(false);
  const { lojistas } = useLojistas();
  
  // Barris state
  const [selectedBarrisEntrega, setSelectedBarrisEntrega] = useState<string[]>([]);
  const [selectedBarrisRetorno, setSelectedBarrisRetorno] = useState<string[]>([]);

  const { createPedido, isLoading } = usePedidosMutations();
  const { movimentarBarris, isLoading: movingBarris } = useBarrisMutations();

  // Check if cliente is CNPJ OR if it's a lojista sale (requires barrel management)
  const clienteIsCNPJ = useMemo(() => {
    if (isVendaLojista) return true;
    return selectedCliente ? isCNPJ(selectedCliente.cpf_cnpj) : false;
  }, [selectedCliente, isVendaLojista]);

  // Dynamic steps based on cliente type
  const steps = useMemo(() => {
    const baseSteps: Step[] = ['cliente', 'produtos'];
    if (clienteIsCNPJ) {
      baseSteps.push('barris');
    }
    baseSteps.push('pagamento');
    return baseSteps;
  }, [clienteIsCNPJ]);

  const selectedLojista = useMemo(() => {
    return lojistas.find(l => l.id === selectedLojistaId);
  }, [lojistas, selectedLojistaId]);

  // Auto-link lojista to a client record when selected
  const handleSelectLojista = async (lojistaId: string) => {
    setSelectedLojistaId(lojistaId);
    const lojista = lojistas.find(l => l.id === lojistaId);
    if (!lojista) return;

    setLinkingLojista(true);
    try {
      // Try to find existing client by phone or name
      const { data: existing } = await supabase
        .from('clientes')
        .select('id, nome, telefone, cpf_cnpj')
        .or(`telefone.eq.${lojista.telefone},nome.ilike.%${lojista.nome}%`)
        .limit(1);

      if (existing && existing.length > 0) {
        setSelectedCliente(existing[0]);
      } else {
        // Auto-create client from lojista data
        const { data: novo } = await supabase
          .from('clientes')
          .insert({
            nome: lojista.nome_fantasia || lojista.nome,
            telefone: lojista.telefone,
            email: lojista.email || `${lojista.nome.toLowerCase().replace(/\s+/g, '.')}@lojista.local`,
            cpf_cnpj: lojista.cnpj,
            origem: 'lojista',
            status: 'ativo',
            empresa: lojista.nome,
          })
          .select('id, nome, telefone, cpf_cnpj')
          .single();

        if (novo) {
          setSelectedCliente(novo);
          setClientes(prev => [...prev, novo]);
        }
      }
    } catch (err) {
      console.error('Erro ao vincular lojista:', err);
    } finally {
      setLinkingLojista(false);
    }
  };

  const stepLabels: Record<Step, string> = {
    cliente: 'Cliente',
    produtos: 'Produtos',
    barris: 'Barris',
    pagamento: 'Pagamento',
  };

  useEffect(() => {
    if (open) {
      fetchClientes();
      fetchProdutos();
    }
  }, [open]);

  const fetchClientes = async () => {
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, telefone, cpf_cnpj')
      .order('nome');
    setClientes(data || []);
  };

  const fetchProdutos = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, preco, estoque, categoria, sku, tipo_produto')
      .eq('ativo', true)
      .order('nome');
    // Include products with stock > 0 OR CHOPP products (always available)
    const filtered = (data || []).filter(p => p.estoque > 0 || p.tipo_produto === 'CHOPP');
    setProdutos(filtered);
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

    // Build full observações with horário
    let fullObs = observacoes;
    if (horarioEntrega) {
      fullObs = `${fullObs ? fullObs + ' | ' : ''}Horário entrega: ${horarioEntrega}`;
    }

    // Build endereco JSON
    const enderecoJson = enderecoEntrega.rua ? enderecoEntrega : undefined;

    try {
      const pedido = await createPedido({
        clienteId: selectedCliente.id,
        lojistaId: isVendaLojista ? selectedLojistaId : null,
        items: cart,
        metodoPagamento,
        observacoes: fullObs,
        dataEntrega,
        valorSinal: valorSinal > 0 ? valorSinal : undefined,
        enderecoEntrega: enderecoJson,
      });

      // Se cliente é CNPJ ou lojista e há barris selecionados, movimentar
      if (clienteIsCNPJ && (selectedBarrisEntrega.length > 0 || selectedBarrisRetorno.length > 0)) {
        const barrisEntregaData = selectedBarrisEntrega.map(id => ({
          barrilId: id,
          codigo: '' // Will be fetched in mutation if needed
        }));
        
        const barrisRetornoData = selectedBarrisRetorno.map(id => ({
          barrilId: id,
          codigo: ''
        }));

        await movimentarBarris({
          pedidoId: pedido.id,
          clienteId: selectedCliente.id,
          lojistaId: isVendaLojista ? selectedLojistaId : null,
          barrisEntrega: barrisEntregaData,
          barrisRetorno: barrisRetornoData,
        });
      }

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
    setHorarioEntrega('');
    setEnderecoEntrega({ rua: '', numero: '', complemento: '', bairro: '', cidade: '' });
    setSearchProduto('');
    setSearchCliente('');
    setValorSinal(0);
    setSelectedBarrisEntrega([]);
    setSelectedBarrisRetorno([]);
    setIsVendaLojista(false);
    setSelectedLojistaId(null);
    setLinkingLojista(false);
  };

  const stepIndex = steps.indexOf(step);

  const goToNextStep = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex < steps.length - 1) {
      setStep(steps[currentIndex + 1]);
    }
  };

  const goToPrevStep = () => {
    const currentIndex = steps.indexOf(step);
    if (currentIndex > 0) {
      setStep(steps[currentIndex - 1]);
    }
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
      <DialogContent className="max-w-5xl h-[85vh] flex flex-col p-0 gap-0">
        {/* Header with Steps */}
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold">
              Nova Venda
            </DialogTitle>
            <div className="flex items-center gap-1">
              {steps.map((s, i) => (
                <div key={s} className="flex items-center">
                  <button
                    onClick={() => {
                      // Navigation logic
                      if (s === 'cliente') setStep('cliente');
                      else if (s === 'produtos' && selectedCliente) setStep('produtos');
                      else if (s === 'barris' && cart.length > 0) setStep('barris');
                      else if (s === 'pagamento' && cart.length > 0) {
                        // Skip barris step if not CNPJ
                        if (!clienteIsCNPJ || steps.indexOf(step) >= steps.indexOf('barris')) {
                          setStep('pagamento');
                        }
                      }
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
                    <span className="hidden sm:inline">{stepLabels[s]}</span>
                    {s === 'barris' && (
                      <Circle className="h-3 w-3 fill-current" />
                    )}
                  </button>
                  {i < steps.length - 1 && <div className="w-6 h-px bg-border mx-1" />}
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
              {/* Lojista Toggle */}
              <div className="flex items-center justify-between p-4 mb-4 bg-muted/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Store className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Venda para Lojista</p>
                    <p className="text-sm text-muted-foreground">Ativar para vendas B2B</p>
                  </div>
                </div>
                <Switch checked={isVendaLojista} onCheckedChange={(checked) => {
                  setIsVendaLojista(checked);
                  if (!checked) {
                    setSelectedLojistaId(null);
                    setSelectedCliente(null);
                  }
                }} />
              </div>

              {/* Lojista Selection */}
              {isVendaLojista && (
                <div className="mb-4 p-4 border rounded-xl space-y-3">
                  <Label>Selecionar Lojista</Label>
                  <div className="flex gap-2">
                    <Select value={selectedLojistaId || ''} onValueChange={handleSelectLojista}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Escolha um lojista..." />
                      </SelectTrigger>
                      <SelectContent>
                        {lojistas.map((lojista) => (
                          <SelectItem key={lojista.id} value={lojista.id}>
                            <div className="flex items-center gap-2">
                              <Store className="h-4 w-4" />
                              <span>{lojista.nome}</span>
                              {lojista.nome_fantasia && (
                                <span className="text-muted-foreground">({lojista.nome_fantasia})</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedLojistaId && (
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setLojistaSheetOpen(true)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  {selectedLojista && (
                    <div className="text-sm text-muted-foreground">
                      CNPJ: {selectedLojista.cnpj || 'N/A'} | Tel: {selectedLojista.telefone}
                    </div>
                  )}
                </div>
              )}

              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar cliente por nome ou telefone..."
                  value={searchCliente}
                  onChange={(e) => setSearchCliente(e.target.value)}
                  className="pl-10 h-11"
                  autoFocus={!isVendaLojista}
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
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{cliente.nome}</p>
                          <p className="text-sm text-muted-foreground truncate">
                            {cliente.telefone}
                          </p>
                        </div>
                        {isCNPJ(cliente.cpf_cnpj) && (
                          <Badge variant="outline" className="shrink-0 text-xs">
                            <Circle className="h-2 w-2 mr-1 fill-current" />
                            CNPJ
                          </Badge>
                        )}
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

              {/* Lojista Details Sheet */}
              <LojistaDetailsSheet
                lojistaId={selectedLojistaId}
                open={lojistaSheetOpen}
                onOpenChange={setLojistaSheetOpen}
              />
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
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground">
                      {selectedCliente?.nome}
                    </p>
                    {clienteIsCNPJ && (
                      <Badge variant="secondary" className="text-xs">
                        <Circle className="h-2 w-2 mr-1 fill-current" />
                        CNPJ
                      </Badge>
                    )}
                  </div>
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

          {/* Step 3: Barris (only for CNPJ clients or lojistas) */}
          {step === 'barris' && selectedCliente && (
            <SelecionarBarrisStep
              clienteId={selectedCliente.id}
              lojistaId={isVendaLojista ? selectedLojistaId : null}
              clienteNome={isVendaLojista && selectedLojista ? selectedLojista.nome : selectedCliente.nome}
              selectedEntrega={selectedBarrisEntrega}
              selectedRetorno={selectedBarrisRetorno}
              onEntregaChange={setSelectedBarrisEntrega}
              onRetornoChange={setSelectedBarrisRetorno}
            />
          )}

          {/* Step 4: Pagamento */}
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
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{selectedCliente?.nome}</p>
                          {clienteIsCNPJ && (
                            <Badge variant="outline" className="text-xs">CNPJ</Badge>
                          )}
                        </div>
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
                  
                  {/* Barris Summary */}
                  {clienteIsCNPJ && (selectedBarrisEntrega.length > 0 || selectedBarrisRetorno.length > 0) && (
                    <>
                      <Separator className="my-4" />
                      <div className="text-sm">
                        <p className="font-medium mb-2 flex items-center gap-2">
                          <Circle className="h-3 w-3 fill-current text-amber-500" />
                          Movimentação de Barris
                        </p>
                        <div className="space-y-1 text-muted-foreground">
                          {selectedBarrisEntrega.length > 0 && (
                            <p>→ {selectedBarrisEntrega.length} barril(s) a entregar (cheios)</p>
                          )}
                          {selectedBarrisRetorno.length > 0 && (
                            <p>← {selectedBarrisRetorno.length} barril(s) a retirar (vazios)</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}
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

                {/* Sinal (Down Payment) */}
                <div className="space-y-3 p-4 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Sinal / Entrada</Label>
                    <Badge variant="outline" className="text-amber-600">
                      Opcional
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Valor que o cliente pagará antecipadamente. Será descontado no momento da entrega.
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-xs">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">R$</span>
                      <Input
                        id="valorSinal"
                        type="number"
                        step="0.01"
                        min="0"
                        max={totalValue}
                        value={valorSinal || ''}
                        onChange={(e) => setValorSinal(Number(e.target.value))}
                        className="pl-10"
                        placeholder="0,00"
                      />
                    </div>
                    {valorSinal > 0 && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Restante na entrega: </span>
                        <span className="font-bold text-primary">
                          R$ {(totalValue - valorSinal).toFixed(2)}
                        </span>
                      </div>
                    )}
                  </div>
                  {valorSinal > totalValue && (
                    <p className="text-sm text-destructive">
                      O sinal não pode ser maior que o valor total do pedido
                    </p>
                  )}
                </div>

                {/* Delivery Date & Time */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="dataEntrega">Data de Entrega</Label>
                    <Input
                      id="dataEntrega"
                      type="date"
                      value={dataEntrega}
                      onChange={(e) => setDataEntrega(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="horarioEntrega">Horário de Entrega</Label>
                    <Input
                      id="horarioEntrega"
                      type="time"
                      value={horarioEntrega}
                      onChange={(e) => setHorarioEntrega(e.target.value)}
                    />
                  </div>
                </div>

                {/* Delivery Address */}
                <div className="space-y-3">
                  <Label className="text-base">Endereço de Entrega</Label>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2 space-y-1">
                      <Label htmlFor="rua" className="text-xs text-muted-foreground">Rua</Label>
                      <Input
                        id="rua"
                        value={enderecoEntrega.rua}
                        onChange={(e) => setEnderecoEntrega(prev => ({ ...prev, rua: e.target.value }))}
                        placeholder="Rua / Avenida"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="numero" className="text-xs text-muted-foreground">Número</Label>
                      <Input
                        id="numero"
                        value={enderecoEntrega.numero}
                        onChange={(e) => setEnderecoEntrega(prev => ({ ...prev, numero: e.target.value }))}
                        placeholder="Nº"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label htmlFor="complemento" className="text-xs text-muted-foreground">Complemento</Label>
                      <Input
                        id="complemento"
                        value={enderecoEntrega.complemento}
                        onChange={(e) => setEnderecoEntrega(prev => ({ ...prev, complemento: e.target.value }))}
                        placeholder="Apto, Sala..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="bairro" className="text-xs text-muted-foreground">Bairro</Label>
                      <Input
                        id="bairro"
                        value={enderecoEntrega.bairro}
                        onChange={(e) => setEnderecoEntrega(prev => ({ ...prev, bairro: e.target.value }))}
                        placeholder="Bairro"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="cidade" className="text-xs text-muted-foreground">Cidade</Label>
                      <Input
                        id="cidade"
                        value={enderecoEntrega.cidade}
                        onChange={(e) => setEnderecoEntrega(prev => ({ ...prev, cidade: e.target.value }))}
                        placeholder="Cidade"
                      />
                    </div>
                  </div>
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
              if (stepIndex === 0) {
                setOpen(false);
              } else {
                goToPrevStep();
              }
            }}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {stepIndex === 0 ? 'Cancelar' : 'Voltar'}
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
                onClick={goToNextStep}
                disabled={cart.length === 0}
                className="gap-2"
              >
                {clienteIsCNPJ ? 'Barris' : 'Pagamento'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {step === 'barris' && (
              <Button
                onClick={() => setStep('pagamento')}
                className="gap-2"
              >
                Pagamento
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}

            {step === 'pagamento' && (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || movingBarris || !metodoPagamento}
                size="lg"
                className="gap-2 px-8"
              >
                {isLoading || movingBarris ? (
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
