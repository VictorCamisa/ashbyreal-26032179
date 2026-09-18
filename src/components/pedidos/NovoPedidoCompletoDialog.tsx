import { useEffect, useMemo, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  ArrowLeft, ArrowRight, Banknote, Check, ChevronDown, CreditCard, Droplets,
  Loader2, MapPin, Minus, Package, Plus, Receipt, Search, ShoppingCart,
  Smartphone, Store, Trash2, User, UserPlus,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { usePedidosMutations, type CartItem } from '@/hooks/usePedidosMutations';
import { useBarrisMutations } from '@/hooks/useBarrisMutations';
import { useLojistas } from '@/hooks/useLojistas';
import { SelecionarBarrisStep } from '@/components/barris/SelecionarBarrisStep';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export interface NovoPedidoCompletoDialogProps {
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  preSelectedLojistaId?: string;
}

interface Produto {
  id: string;
  nome: string;
  preco: number;
  estoque: number;
  categoria: string | null;
  sku: string | null;
  tipo_produto: string | null;
}

interface Cliente {
  id: string;
  nome: string;
  telefone: string | null;
  cpf_cnpj: string | null;
}

type Passo = 'quem' | 'itens' | 'fechamento';
type Destinatario = 'cliente' | 'lojista';

const PASSOS: { id: Passo; label: string }[] = [
  { id: 'quem', label: 'Para quem' },
  { id: 'itens', label: 'Itens' },
  { id: 'fechamento', label: 'Fechamento' },
];

const PAGAMENTOS = [
  { value: 'pix', label: 'PIX', icon: Smartphone },
  { value: 'dinheiro', label: 'Dinheiro', icon: Banknote },
  { value: 'cartao', label: 'Cartão', icon: CreditCard },
  { value: 'boleto', label: 'Boleto', icon: Receipt },
];

const moeda = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const soDigitos = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '');

export function NovoPedidoCompletoDialog({
  onSuccess,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
  preSelectedLojistaId,
}: NovoPedidoCompletoDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = (v: boolean) => {
    if (externalOnOpenChange) externalOnOpenChange(v);
    else setInternalOpen(v);
  };

  const [passo, setPasso] = useState<Passo>('quem');
  const [destinatario, setDestinatario] = useState<Destinatario>('cliente');

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [carregandoClientes, setCarregandoClientes] = useState(true);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [buscaContraparte, setBuscaContraparte] = useState('');
  const [buscaProduto, setBuscaProduto] = useState('');

  const [clienteSelecionado, setClienteSelecionado] = useState<Cliente | null>(null);
  const [lojistaId, setLojistaId] = useState<string | null>(null);

  // Cadastro rápido de cliente, direto no fluxo da venda
  const [criandoCliente, setCriandoCliente] = useState(false);
  const [salvandoCliente, setSalvandoCliente] = useState(false);
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', cpf_cnpj: '' });

  const [carrinho, setCarrinho] = useState<CartItem[]>([]);
  const [pagamento, setPagamento] = useState('');
  const [valorSinal, setValorSinal] = useState('');
  const [numeroPedido, setNumeroPedido] = useState('');
  const [temFrete, setTemFrete] = useState(false);
  const [valorFrete, setValorFrete] = useState('');
  const [precisaChopeira, setPrecisaChopeira] = useState(false);
  const [precisaCO2, setPrecisaCO2] = useState(false);
  const [precisaCopos, setPrecisaCopos] = useState(false);
  const [temBarrilConsignado, setTemBarrilConsignado] = useState(false);
  const [confirmarPagamentoAberto, setConfirmarPagamentoAberto] = useState(false);
  const [dataEntrega, setDataEntrega] = useState('');
  const [horarioEntrega, setHorarioEntrega] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [enderecoAberto, setEnderecoAberto] = useState(false);
  const [endereco, setEndereco] = useState({ rua: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '' });

  const [barrisEntrega, setBarrisEntrega] = useState<string[]>([]);
  const [barrisRetorno, setBarrisRetorno] = useState<string[]>([]);

  const { lojistas, isLoading: carregandoLojistas } = useLojistas();
  const { createPedido, isLoading } = usePedidosMutations();
  const { movimentarBarris } = useBarrisMutations();

  const lojistaSelecionado = useMemo(
    () => lojistas.find((l) => l.id === lojistaId),
    [lojistas, lojistaId],
  );

  const ehB2B = destinatario === 'lojista';

  const nomeContraparte = ehB2B
    ? lojistaSelecionado?.nome ?? ''
    : clienteSelecionado?.nome ?? '';

  const contraparteDefinida = ehB2B ? !!lojistaId : !!clienteSelecionado;

  const subtotal = carrinho.reduce((acc, i) => acc + i.quantidade * i.precoUnitario, 0);
  const frete = temFrete ? (Number(valorFrete.replace(',', '.')) || 0) : 0;
  const total = subtotal + frete;
  const totalItens = carrinho.reduce((acc, i) => acc + i.quantidade, 0);

  useEffect(() => {
    if (!open) return;
    carregarClientes();
    carregarProdutos();
  }, [open]);

  useEffect(() => {
    if (preSelectedLojistaId && open) {
      setDestinatario('lojista');
      setLojistaId(preSelectedLojistaId);
    }
  }, [preSelectedLojistaId, open]);

  const carregarClientes = async () => {
    setCarregandoClientes(true);
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, telefone, cpf_cnpj')
      .order('nome');
    setClientes(data ?? []);
    setCarregandoClientes(false);
  };

  const carregarProdutos = async () => {
    const { data } = await supabase
      .from('produtos')
      .select('id, nome, preco, estoque, categoria, sku, tipo_produto')
      .eq('ativo', true)
      .order('nome');
    // Chopp é produzido sob demanda: não some da lista por estoque zerado.
    setProdutos((data ?? []).filter((p) => p.estoque > 0 || p.tipo_produto === 'CHOPP'));
  };

  const contrapartesFiltradas = useMemo(() => {
    const busca = buscaContraparte.trim().toLowerCase();
    if (ehB2B) {
      return lojistas
        .filter((l) =>
          busca === '' ||
          l.nome.toLowerCase().includes(busca) ||
          l.nome_fantasia?.toLowerCase().includes(busca) ||
          soDigitos(l.telefone).includes(soDigitos(busca)))
        .map((l) => ({
          id: l.id,
          nome: l.nome,
          detalhe: [l.nome_fantasia, l.telefone].filter(Boolean).join(' · '),
          selo: l.cnpj ? 'CNPJ' : null,
        }));
    }
    return clientes
      .filter((c) =>
        busca === '' ||
        c.nome.toLowerCase().includes(busca) ||
        soDigitos(c.telefone).includes(soDigitos(busca)))
      .map((c) => ({
        id: c.id,
        nome: c.nome,
        detalhe: c.telefone ?? 'sem telefone',
        selo: soDigitos(c.cpf_cnpj).length === 14 ? 'CNPJ' : null,
      }));
  }, [ehB2B, lojistas, clientes, buscaContraparte]);

  const produtosFiltrados = useMemo(() => {
    const busca = buscaProduto.trim().toLowerCase();
    if (!busca) return produtos;
    return produtos.filter(
      (p) =>
        p.nome.toLowerCase().includes(busca) ||
        p.sku?.toLowerCase().includes(busca) ||
        p.categoria?.toLowerCase().includes(busca),
    );
  }, [produtos, buscaProduto]);

  const salvarNovoCliente = async () => {
    const nome = novoCliente.nome.trim();
    const telefone = novoCliente.telefone.trim();
    if (!nome) {
      toast.error('Informe o nome do cliente.');
      return;
    }

    setSalvandoCliente(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nome,
          telefone: telefone || 'NAO INFORMADO',
          // A coluna exige e-mail; sem um real, marcamos a origem para o cadastro
          // aparecer na fila de revisão em vez de fingir que o dado existe.
          email: `sem-email-${Date.now()}@taubatechopp.local`,
          cpf_cnpj: novoCliente.cpf_cnpj.trim() || null,
          origem: 'Venda direta',
          status: 'ativo',
        })
        .select('id, nome, telefone, cpf_cnpj')
        .single();

      if (error) throw error;

      setClientes((prev) => [...prev, data].sort((a, b) => a.nome.localeCompare(b.nome)));
      setClienteSelecionado(data);
      setCriandoCliente(false);
      setNovoCliente({ nome: '', telefone: '', cpf_cnpj: '' });
      toast.success(`${data.nome} cadastrado.`);
      setPasso('itens');
    } catch (e) {
      toast.error('Não foi possível cadastrar: ' + (e as Error).message);
    } finally {
      setSalvandoCliente(false);
    }
  };

  const adicionar = (produto: Produto) => {
    setCarrinho((atual) => {
      const existente = atual.find((i) => i.produtoId === produto.id);
      if (existente) {
        return atual.map((i) =>
          i.produtoId === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      }
      return [...atual, {
        produtoId: produto.id,
        nome: produto.nome,
        quantidade: 1,
        precoUnitario: produto.preco,
        estoque: produto.estoque,
      }];
    });
  };

  const alterarQuantidade = (produtoId: string, delta: number) => {
    setCarrinho((atual) =>
      atual.flatMap((i) => {
        if (i.produtoId !== produtoId) return [i];
        const nova = i.quantidade + delta;
        return nova <= 0 ? [] : [{ ...i, quantidade: nova }];
      }));
  };

  const alterarPreco = (produtoId: string, preco: string) => {
    const valor = Number(preco.replace(',', '.'));
    if (!Number.isFinite(valor) || valor < 0) return;
    setCarrinho((atual) => atual.map((i) => i.produtoId === produtoId ? { ...i, precoUnitario: valor } : i));
  };

  const limpar = () => {
    setPasso('quem');
    setDestinatario('cliente');
    setClienteSelecionado(null);
    setLojistaId(null);
    setCarrinho([]);
    setPagamento('');
    setValorSinal('');
    setNumeroPedido('');
    setTemFrete(false);
    setValorFrete('');
    setPrecisaChopeira(false);
    setPrecisaCO2(false);
    setPrecisaCopos(false);
    setTemBarrilConsignado(false);
    setConfirmarPagamentoAberto(false);
    setDataEntrega('');
    setHorarioEntrega('');
    setObservacoes('');
    setEndereco({ rua: '', numero: '', complemento: '', bairro: '', cidade: '', cep: '' });
    setEnderecoAberto(false);
    setBuscaContraparte('');
    setBuscaProduto('');
    setBarrisEntrega([]);
    setBarrisRetorno([]);
    setCriandoCliente(false);
    setNovoCliente({ nome: '', telefone: '', cpf_cnpj: '' });
  };

  const finalizar = async () => {
    if (!contraparteDefinida || carrinho.length === 0) return;

    const necessidades = [
      precisaChopeira && 'Chopeira (sem custo)',
      precisaCO2 && 'CO₂',
      precisaCopos && 'Copos',
      temBarrilConsignado && 'Barril consignado',
    ].filter(Boolean).join(', ');
    const obs = [
      observacoes.trim(),
      horarioEntrega && `Horário de entrega: ${horarioEntrega}`,
      necessidades && `Necessidades: ${necessidades}`,
      temFrete && `Frete: ${moeda(frete)}`,
    ]
      .filter(Boolean)
      .join(' | ');

    try {
      const pedido = await createPedido({
        clienteId: ehB2B ? null : clienteSelecionado!.id,
        lojistaId: ehB2B ? lojistaId : null,
        items: carrinho,
        metodoPagamento: pagamento,
        observacoes: obs,
        dataEntrega,
        valorSinal: Number(valorSinal.replace(',', '.')) > 0 ? Number(valorSinal.replace(',', '.')) : undefined,
        numeroPedido,
        valorFrete: frete,
        enderecoEntrega: Object.values(endereco).some(Boolean) ? endereco : undefined,
      });

      if (ehB2B && (barrisEntrega.length > 0 || barrisRetorno.length > 0)) {
        await movimentarBarris({
          pedidoId: pedido.id,
          clienteId: clienteSelecionado?.id ?? null,
          lojistaId,
          barrisEntrega: barrisEntrega.map((id) => ({ barrilId: id, codigo: '' })),
          barrisRetorno: barrisRetorno.map((id) => ({ barrilId: id, codigo: '' })),
        });
      }

      limpar();
      setOpen(false);
      onSuccess?.();
    } catch {
      // erro já reportado pela mutation
    }
  };

  const carregando = ehB2B ? carregandoLojistas : carregandoClientes;
  const podeAvancar = passo === 'quem' ? contraparteDefinida : carrinho.length > 0;
  const passoAtual = PASSOS.findIndex((p) => p.id === passo);

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) limpar(); }}>
      {externalOpen === undefined && (
        <DialogTrigger asChild>
          <Button size="lg" className="gap-2">
            <ShoppingCart className="h-5 w-5" />
            Nova Venda
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="flex max-h-[88vh] w-[calc(100vw-2rem)] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="space-y-3 border-b border-border/60 px-5 py-4 text-left">
          <div>
            <DialogTitle className="text-base font-semibold">Nova venda</DialogTitle>
            <DialogDescription className="text-xs">
              {contraparteDefinida
                ? `${nomeContraparte}${totalItens > 0 ? ` · ${totalItens} ${totalItens === 1 ? 'item' : 'itens'}` : ''}`
                : 'Escolha para quem é a venda'}
            </DialogDescription>
          </div>

          {/* Trilha dos passos: mostra onde está sem virar barra de navegação */}
          <div className="flex items-center gap-2">
            {PASSOS.map((p, i) => (
              <div key={p.id} className="flex flex-1 items-center gap-2">
                <button
                  type="button"
                  disabled={i > passoAtual}
                  onClick={() => i < passoAtual && setPasso(p.id)}
                  className={cn(
                    'flex items-center gap-1.5 text-xs transition-colors',
                    i === passoAtual ? 'font-medium text-foreground'
                      : i < passoAtual ? 'text-muted-foreground hover:text-foreground'
                      : 'text-muted-foreground/50',
                  )}
                >
                  <span className={cn(
                    'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-semibold',
                    i === passoAtual ? 'bg-primary text-primary-foreground'
                      : i < passoAtual ? 'bg-primary/15 text-primary'
                      : 'bg-muted text-muted-foreground',
                  )}>
                    {i < passoAtual ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  <span className="hidden sm:inline">{p.label}</span>
                </button>
                {i < PASSOS.length - 1 && (
                  <div className={cn('h-px flex-1', i < passoAtual ? 'bg-primary/30' : 'bg-border')} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
          {/* ------------------------------------------------ 1. Para quem */}
          {passo === 'quem' && (
            <div className="flex h-full flex-col">
              <div className="space-y-3 px-5 pt-4">
                <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary/60 p-1">
                  {([
                    { id: 'cliente' as const, label: 'Cliente direto', icon: User },
                    { id: 'lojista' as const, label: 'Lojista (B2B)', icon: Store },
                  ]).map(({ id, label, icon: Icone }) => (
                    <button
                      key={id}
                      onClick={() => {
                        setDestinatario(id);
                        setBuscaContraparte('');
                        setCriandoCliente(false);
                      }}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium transition-all',
                        destinatario === id
                          ? 'bg-card text-foreground shadow-soft'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <Icone className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>

                {!criandoCliente && (
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        autoFocus
                        placeholder={ehB2B ? 'Buscar lojista...' : 'Buscar por nome ou telefone...'}
                        value={buscaContraparte}
                        onChange={(e) => setBuscaContraparte(e.target.value)}
                        className="h-10 pl-9"
                      />
                    </div>
                    {!ehB2B && (
                      <Button
                        variant="outline"
                        className="h-10 shrink-0 gap-1.5"
                        onClick={() => {
                          setNovoCliente({ nome: buscaContraparte.trim(), telefone: '', cpf_cnpj: '' });
                          setCriandoCliente(true);
                        }}
                      >
                        <UserPlus className="h-4 w-4" />
                        <span className="hidden sm:inline">Novo</span>
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {criandoCliente ? (
                <div className="space-y-3 px-5 py-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Novo cliente</p>
                    <Button variant="ghost" size="sm" onClick={() => setCriandoCliente(false)}>
                      Cancelar
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="nc-nome" className="text-xs">Nome *</Label>
                      <Input
                        id="nc-nome"
                        autoFocus
                        value={novoCliente.nome}
                        onChange={(e) => setNovoCliente((c) => ({ ...c, nome: e.target.value }))}
                        placeholder="Nome de quem está comprando"
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor="nc-fone" className="text-xs">Telefone</Label>
                        <Input
                          id="nc-fone"
                          value={novoCliente.telefone}
                          onChange={(e) => setNovoCliente((c) => ({ ...c, telefone: e.target.value }))}
                          placeholder="(12) 99999-9999"
                          inputMode="tel"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="nc-doc" className="text-xs">CPF / CNPJ</Label>
                        <Input
                          id="nc-doc"
                          value={novoCliente.cpf_cnpj}
                          onChange={(e) => setNovoCliente((c) => ({ ...c, cpf_cnpj: e.target.value }))}
                          placeholder="Opcional"
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                  </div>
                  <Button
                    className="w-full gap-2"
                    onClick={salvarNovoCliente}
                    disabled={salvandoCliente || !novoCliente.nome.trim()}
                  >
                    {salvandoCliente
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Salvando...</>
                      : <><Check className="h-4 w-4" />Cadastrar e continuar</>}
                  </Button>
                </div>
              ) : (
                <ScrollArea className="mt-3 min-h-0 flex-1 px-5 pb-4">
                  {carregando ? (
                    <div className="space-y-1.5 pt-1">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/50" />
                      ))}
                    </div>
                  ) : contrapartesFiltradas.length === 0 ? (
                    <div className="flex flex-col items-center gap-3 py-10 text-center">
                      <div className="grid h-11 w-11 place-items-center rounded-full bg-muted">
                        {ehB2B ? <Store className="h-5 w-5 text-muted-foreground" />
                               : <User className="h-5 w-5 text-muted-foreground" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {ehB2B ? 'Nenhum lojista encontrado' : 'Nenhum cliente encontrado'}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {buscaContraparte
                            ? `Nada corresponde a "${buscaContraparte}"`
                            : ehB2B ? 'Cadastre o lojista no módulo Lojistas' : 'Cadastre o primeiro cliente'}
                        </p>
                      </div>
                      {!ehB2B && (
                        <Button
                          size="sm"
                          className="gap-1.5"
                          onClick={() => {
                            setNovoCliente({ nome: buscaContraparte.trim(), telefone: '', cpf_cnpj: '' });
                            setCriandoCliente(true);
                          }}
                        >
                          <UserPlus className="h-4 w-4" />
                          {buscaContraparte ? `Cadastrar "${buscaContraparte}"` : 'Cadastrar cliente'}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {contrapartesFiltradas.map((item) => {
                        const ativo = ehB2B ? lojistaId === item.id : clienteSelecionado?.id === item.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => {
                              if (ehB2B) {
                                setLojistaId(item.id);
                                setClienteSelecionado(null);
                              } else {
                                setClienteSelecionado(clientes.find((c) => c.id === item.id) ?? null);
                                setLojistaId(null);
                              }
                              setPasso('itens');
                            }}
                            className={cn(
                              'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                              ativo ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/40 hover:bg-muted/40',
                            )}
                          >
                            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10">
                              {ehB2B ? <Store className="h-4 w-4 text-primary" />
                                     : <User className="h-4 w-4 text-primary" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{item.nome}</p>
                              <p className="truncate text-xs text-muted-foreground">{item.detalhe}</p>
                            </div>
                            {item.selo && (
                              <Badge variant="outline" className="shrink-0 text-[10px]">{item.selo}</Badge>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </ScrollArea>
              )}
            </div>
          )}

          {/* --------------------------------------------------- 2. Itens */}
          {passo === 'itens' && (
            <div className="flex h-full flex-col lg:flex-row">
              <div className="flex min-h-0 flex-1 flex-col lg:border-r lg:border-border/60">
                <div className="relative px-5 pt-4">
                  <Search className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    autoFocus
                    placeholder="Buscar produto..."
                    value={buscaProduto}
                    onChange={(e) => setBuscaProduto(e.target.value)}
                    className="h-10 pl-9"
                  />
                </div>
                <ScrollArea className="mt-3 min-h-0 flex-1 px-5 pb-4">
                  <div className="space-y-1.5">
                    {produtosFiltrados.map((produto) => {
                      const noCarrinho = carrinho.find((i) => i.produtoId === produto.id);
                      return (
                        <button
                          key={produto.id}
                          onClick={() => adicionar(produto)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-all',
                            noCarrinho ? 'border-primary/40 bg-primary/5' : 'border-border/60 hover:border-primary/40 hover:bg-muted/40',
                          )}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{produto.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {moeda(produto.preco)}
                              {produto.tipo_produto !== 'CHOPP' && ` · ${produto.estoque} em estoque`}
                            </p>
                          </div>
                          {noCarrinho ? (
                            <Badge className="h-6 min-w-6 justify-center px-1.5">{noCarrinho.quantidade}</Badge>
                          ) : (
                            <Plus className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                        </button>
                      );
                    })}
                    {produtosFiltrados.length === 0 && (
                      <p className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum produto encontrado
                      </p>
                    )}
                  </div>
                </ScrollArea>
              </div>

              <div className="flex max-h-[38%] min-h-0 flex-col border-t border-border/60 bg-muted/20 lg:max-h-none lg:w-72 lg:border-t-0">
                <div className="flex items-center justify-between px-4 py-3">
                  <p className="flex items-center gap-1.5 text-sm font-medium">
                    <ShoppingCart className="h-4 w-4" />
                    Carrinho
                  </p>
                  {totalItens > 0 && <Badge variant="outline">{totalItens}</Badge>}
                </div>
                <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
                  {carrinho.length === 0 ? (
                    <div className="py-8 text-center">
                      <Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-xs text-muted-foreground">
                        Toque num produto para adicionar
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {carrinho.map((item) => (
                        <div key={item.produtoId} className="rounded-lg bg-card p-2.5">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 truncate text-xs font-medium">{item.nome}</p>
                            <button
                              onClick={() => setCarrinho((c) => c.filter((i) => i.produtoId !== item.produtoId))}
                              className="text-muted-foreground transition-colors hover:text-destructive"
                              aria-label={`Remover ${item.nome}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center gap-1">
                              <Button variant="outline" size="icon" className="h-6 w-6"
                                onClick={() => alterarQuantidade(item.produtoId, -1)}>
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-7 text-center text-xs tabular-nums">{item.quantidade}</span>
                              <Button variant="outline" size="icon" className="h-6 w-6"
                                onClick={() => alterarQuantidade(item.produtoId, 1)}>
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Input
                                aria-label={`Preço unitário de ${item.nome}`}
                                className="h-7 w-20 px-2 text-right text-xs"
                                inputMode="decimal"
                                value={item.precoUnitario}
                                onChange={(e) => alterarPreco(item.produtoId, e.target.value)}
                              />
                              <span className="text-xs font-semibold tabular-nums">
                                {moeda(item.precoUnitario * item.quantidade)}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </div>
          )}

          {/* ---------------------------------------------- 3. Fechamento */}
          {passo === 'fechamento' && (
            <ScrollArea className="h-full">
              <div className="space-y-5 px-5 py-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="numero-pedido" className="text-xs">Número do pedido</Label>
                    <Input id="numero-pedido" inputMode="numeric" placeholder="Automático" value={numeroPedido}
                      onChange={(e) => setNumeroPedido(e.target.value)} />
                  </div>
                  <div className="flex items-end gap-3 pb-1">
                    <Switch id="frete" checked={temFrete} onCheckedChange={setTemFrete} />
                    <Label htmlFor="frete" className="text-sm">Há frete?</Label>
                    {temFrete && <Input aria-label="Valor do frete" className="h-9 w-28" inputMode="decimal" placeholder="R$ 0,00" value={valorFrete} onChange={(e) => setValorFrete(e.target.value)} />}
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-border/60 p-3">
                  <p className="text-xs font-medium">Itens e estrutura necessários</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      ['chopeira', 'Precisa de chopeira? (sem custo)', precisaChopeira, setPrecisaChopeira],
                      ['co2', 'Precisa de CO₂?', precisaCO2, setPrecisaCO2],
                      ['copos', 'Precisa de copos?', precisaCopos, setPrecisaCopos],
                      ['consignado', 'Há barril consignado?', temBarrilConsignado, setTemBarrilConsignado],
                    ].map(([id, label, checked, setChecked]) => (
                      <div key={id as string} className="flex items-center justify-between gap-2">
                        <Label htmlFor={id as string} className="text-xs font-normal">{label as string}</Label>
                        <Switch id={id as string} checked={checked as boolean} onCheckedChange={setChecked as (checked: boolean) => void} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs">Forma de pagamento</Label>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {PAGAMENTOS.map(({ value, label, icon: Icone }) => (
                      <button
                        key={value}
                        onClick={() => setPagamento(pagamento === value ? '' : value)}
                        className={cn(
                          'flex flex-col items-center gap-1.5 rounded-xl border py-3 text-xs font-medium transition-all',
                          pagamento === value
                            ? 'border-primary bg-primary/5 text-primary'
                            : 'border-border/60 text-muted-foreground hover:border-primary/40',
                        )}
                      >
                        <Icone className="h-4 w-4" />
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="sinal" className="text-xs">Sinal / entrada</Label>
                    <Input id="sinal" inputMode="decimal" placeholder="0,00"
                      value={valorSinal} onChange={(e) => setValorSinal(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="data" className="text-xs">Data de entrega</Label>
                    <Input id="data" type="date" value={dataEntrega}
                      onChange={(e) => setDataEntrega(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="hora" className="text-xs">Horário</Label>
                    <Input id="hora" type="time" value={horarioEntrega}
                      onChange={(e) => setHorarioEntrega(e.target.value)} />
                  </div>
                </div>

                <Collapsible open={enderecoAberto} onOpenChange={setEnderecoAberto}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/60 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40">
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      Endereço de entrega
                      {endereco.rua && <Badge variant="secondary" className="text-[10px]">preenchido</Badge>}
                    </span>
                    <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', enderecoAberto && 'rotate-180')} />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="grid gap-3 pt-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="cep" className="text-xs">CEP</Label>
                      <Input id="cep" inputMode="numeric" placeholder="00000-000" value={endereco.cep}
                        onChange={(e) => setEndereco((v) => ({ ...v, cep: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="rua" className="text-xs">Rua</Label>
                      <Input id="rua" value={endereco.rua}
                        onChange={(e) => setEndereco((v) => ({ ...v, rua: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="num" className="text-xs">Número</Label>
                      <Input id="num" value={endereco.numero}
                        onChange={(e) => setEndereco((v) => ({ ...v, numero: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="compl" className="text-xs">Complemento</Label>
                      <Input id="compl" value={endereco.complemento}
                        onChange={(e) => setEndereco((v) => ({ ...v, complemento: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bairro" className="text-xs">Bairro</Label>
                      <Input id="bairro" value={endereco.bairro}
                        onChange={(e) => setEndereco((v) => ({ ...v, bairro: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="cidade" className="text-xs">Cidade</Label>
                      <Input id="cidade" value={endereco.cidade}
                        onChange={(e) => setEndereco((v) => ({ ...v, cidade: e.target.value }))} />
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {ehB2B && lojistaId && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-border/60 px-3 py-2.5 text-sm transition-colors hover:bg-muted/40">
                      <span className="flex items-center gap-2">
                        <Droplets className="h-4 w-4 text-muted-foreground" />
                        Barris (entrega e retorno)
                        {(barrisEntrega.length > 0 || barrisRetorno.length > 0) && (
                          <Badge variant="secondary" className="text-[10px]">
                            {barrisEntrega.length + barrisRetorno.length}
                          </Badge>
                        )}
                      </span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-3">
                      <SelecionarBarrisStep
                        clienteId={clienteSelecionado?.id ?? null}
                        lojistaId={lojistaId}
                        clienteNome={nomeContraparte}
                        selectedEntrega={barrisEntrega}
                        selectedRetorno={barrisRetorno}
                        onEntregaChange={setBarrisEntrega}
                        onRetornoChange={setBarrisRetorno}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="obs" className="text-xs">Observações</Label>
                  <Textarea id="obs" rows={2} value={observacoes}
                    onChange={(e) => setObservacoes(e.target.value)}
                    placeholder="Sabores, copos, combinados com o cliente..." />
                </div>

                <div className="rounded-xl border border-border/60 bg-muted/30 p-3">
                  <div className="space-y-1 text-sm">
                    {carrinho.map((i) => (
                      <div key={i.produtoId} className="flex justify-between text-muted-foreground">
                        <span className="truncate pr-2">{i.quantidade}× {i.nome}</span>
                        <span className="shrink-0 tabular-nums">{moeda(i.precoUnitario * i.quantidade)}</span>
                      </div>
                    ))}
                    {temFrete && (
                      <div className="flex justify-between text-muted-foreground">
                        <span>Frete</span><span className="tabular-nums">{moeda(frete)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border/60 pt-1.5 font-semibold">
                      <span>Total</span>
                      <span className="tabular-nums">{moeda(total)}</span>
                    </div>
                    {Number(valorSinal) > 0 && (
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Restante após o sinal</span>
                        <span className="tabular-nums">{moeda(total - Number(valorSinal))}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          )}
        </div>

        {/* Rodapé: o valor fica sempre visível, junto da ação principal */}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 px-5 py-3">
          <div className="min-w-0">
            {totalItens > 0 ? (
              <>
                <p className="text-sm font-semibold tabular-nums">{moeda(total)}</p>
                <p className="text-[11px] text-muted-foreground">
                  {totalItens} {totalItens === 1 ? 'item' : 'itens'}
                </p>
              </>
            ) : (
              <p className="truncate text-xs text-muted-foreground">
                {contraparteDefinida ? nomeContraparte : 'Nenhum item ainda'}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {passoAtual > 0 && (
              <Button
                variant="ghost"
                onClick={() => setPasso(PASSOS[passoAtual - 1].id)}
                className="gap-1.5 px-2 sm:px-4"
              >
                <ArrowLeft className="h-4 w-4" />
                {/* No celular o rótulo daria colisão com o total */}
                <span className="hidden sm:inline">Voltar</span>
              </Button>
            )}
            {passo === 'fechamento' ? (
              <Button onClick={() => setConfirmarPagamentoAberto(true)} disabled={isLoading || carrinho.length === 0} className="gap-1.5">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Confirmar pagamento
              </Button>
            ) : (
              <Button
                onClick={() => setPasso(PASSOS[passoAtual + 1].id)}
                disabled={!podeAvancar}
                className="gap-1.5"
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
      <Dialog open={confirmarPagamentoAberto} onOpenChange={setConfirmarPagamentoAberto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar pagamento</DialogTitle>
            <DialogDescription>Confira o valor e a forma de pagamento antes de concluir a venda.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Pedido</span><span>{numeroPedido ? `#${numeroPedido}` : 'Numeração automática'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{moeda(subtotal)}</span></div>
            {temFrete && <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>{moeda(frete)}</span></div>}
            <div className="flex justify-between"><span className="text-muted-foreground">Pagamento</span><span>{PAGAMENTOS.find((p) => p.value === pagamento)?.label ?? 'Não informado'}</span></div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold"><span>Total</span><span>{moeda(total)}</span></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmarPagamentoAberto(false)}>Voltar e editar</Button>
            <Button onClick={() => { setConfirmarPagamentoAberto(false); finalizar(); }} disabled={isLoading}>Concluir venda</Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
