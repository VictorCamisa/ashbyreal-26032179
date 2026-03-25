import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  Receipt,
  Loader2,
  ShoppingBag,
  Package,
  User,
  Pencil,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useProdutos } from '@/hooks/useProdutos';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  produtoId: string;
  nome: string;
  sku: string | null;
  preco: number;
  quantidade: number;
}

// Default categories to always show
const DEFAULT_CATEGORIES = ['Pilsen', 'IPA', 'Ale'];

function classifyProduct(produto: { nome: string; categoria?: string | null }): string | null {
  const text = `${produto.nome} ${produto.categoria || ''}`.toLowerCase();
  if (text.includes('pilsen') || text.includes('pilsner')) return 'Pilsen';
  if (text.includes('ipa')) return 'IPA';
  if (text.includes('ale') && !text.includes('malte')) return 'Ale';
  if (text.includes('weiss') || text.includes('wheat') || text.includes('trigo')) return 'Weiss';
  if (text.includes('escuro') || text.includes('escura') || text.includes('stout') || text.includes('porter')) return 'Escuro';
  if (text.includes('vinho tinto')) return 'Vinho Tinto';
  if (text.includes('vinho branco')) return 'Vinho Branco';
  if (text.includes('puro malte')) return 'Puro Malte';
  return produto.categoria || 'Outros';
}

export function PDVPanel() {
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [clienteId, setClienteId] = useState<string | null>(null);
  const [clienteNome, setClienteNome] = useState('');
  const [clienteSearch, setClienteSearch] = useState('');
  const [clienteResults, setClienteResults] = useState<{ id: string; nome: string; telefone: string }[]>([]);
  const [metodoPagamento, setMetodoPagamento] = useState<string>('dinheiro');
  const [isFinalizando, setIsFinalizando] = useState(false);
  const [danfeUrl, setDanfeUrl] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editEstoque, setEditEstoque] = useState('');
  const [isSavingEstoque, setIsSavingEstoque] = useState(false);
  const { produtos, isLoading, refetch: refetchProdutos } = useProdutos();
  const { toast } = useToast();

  // Group products by classified category
  const categorizedProducts = useMemo(() => {
    const filtered = search.trim()
      ? produtos.filter(
          (p) =>
            p.nome.toLowerCase().includes(search.toLowerCase()) ||
            (p.categoria && p.categoria.toLowerCase().includes(search.toLowerCase()))
        )
      : produtos;

    const groups: Record<string, typeof produtos> = {};
    filtered.forEach((p) => {
      const groupName = classifyProduct(p);
      if (!groupName) return;
      // By default show only Pilsen, IPA, Ale; when searching show all
      if (!search.trim() && !DEFAULT_CATEGORIES.includes(groupName)) return;
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(p);
    });

    // Sort: default categories first, then alphabetical
    return DEFAULT_CATEGORIES
      .filter(cat => groups[cat])
      .map(cat => ({ category: cat, products: groups[cat] }))
      .concat(
        Object.entries(groups)
          .filter(([cat]) => !DEFAULT_CATEGORIES.includes(cat))
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([category, products]) => ({ category, products }))
      );
  }, [produtos, search]);

  const total = useMemo(
    () => cart.reduce((acc, item) => acc + item.preco * item.quantidade, 0),
    [cart]
  );

  const addToCart = (produto: typeof produtos[0]) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.produtoId === produto.id);
      if (existing) {
        return prev.map((c) =>
          c.produtoId === produto.id ? { ...c, quantidade: c.quantidade + 1 } : c
        );
      }
      return [
        ...prev,
        {
          produtoId: produto.id,
          nome: produto.nome,
          sku: produto.sku || null,
          preco: produto.preco,
          quantidade: 1,
        },
      ];
    });
  };

  const updateQty = (produtoId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.produtoId === produtoId ? { ...c, quantidade: c.quantidade + delta } : c
        )
        .filter((c) => c.quantidade > 0)
    );
  };

  const removeFromCart = (produtoId: string) => {
    setCart((prev) => prev.filter((c) => c.produtoId !== produtoId));
  };

  const searchCliente = async (term: string) => {
    setClienteSearch(term);
    if (term.length < 2) {
      setClienteResults([]);
      return;
    }
    const { data } = await supabase
      .from('clientes')
      .select('id, nome, telefone')
      .ilike('nome', `%${term}%`)
      .limit(5);
    setClienteResults(data || []);
  };

  const selectCliente = (c: { id: string; nome: string }) => {
    setClienteId(c.id);
    setClienteNome(c.nome);
    setClienteSearch('');
    setClienteResults([]);
  };

  const clearCliente = () => {
    setClienteId(null);
    setClienteNome('');
  };

  const handleEditEstoque = (produto: any) => {
    setEditingProduct(produto);
    setEditEstoque(String(produto.estoque));
  };

  const handleSaveEstoque = async () => {
    if (!editingProduct) return;
    setIsSavingEstoque(true);
    try {
      const { error } = await supabase
        .from('produtos')
        .update({ estoque: parseInt(editEstoque, 10) })
        .eq('id', editingProduct.id);
      if (error) throw error;
      toast({ title: 'Estoque atualizado', description: `${editingProduct.nome}: ${editEstoque} unidades` });
      refetchProdutos();
      setEditingProduct(null);
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setIsSavingEstoque(false);
    }
  };

  const handleFinalizar = async () => {
    if (cart.length === 0) {
      toast({ title: 'Carrinho vazio', description: 'Adicione produtos antes de finalizar.', variant: 'destructive' });
      return;
    }

    setIsFinalizando(true);
    try {
      const { data: pedido, error: pedErr } = await supabase
        .from('pedidos')
        .insert({
          cliente_id: clienteId,
          status: 'pago',
          valor_total: total,
          metodo_pagamento: metodoPagamento,
          data_pagamento: new Date().toISOString(),
        })
        .select()
        .single();

      if (pedErr) throw pedErr;

      const { error: itensErr } = await supabase.from('pedido_itens').insert(
        cart.map((item) => ({
          pedido_id: pedido.id,
          produto_id: item.produtoId,
          quantidade: item.quantidade,
          preco_unitario: item.preco,
          subtotal: item.preco * item.quantidade,
        }))
      );
      if (itensErr) throw itensErr;

      const { data: doc, error: docErr } = await supabase
        .from('documentos_fiscais')
        .insert({
          tipo: 'NFCE' as any,
          direcao: 'SAIDA' as any,
          status: 'RASCUNHO' as any,
          pedido_id: pedido.id,
          cliente_id: clienteId,
          natureza_operacao: 'Venda de mercadoria',
          valor_produtos: total,
          valor_total: total,
          valor_servicos: 0,
          valor_desconto: 0,
          valor_frete: 0,
          valor_outras: 0,
        })
        .select()
        .single();

      if (docErr) throw docErr;

      const { error: docItensErr } = await supabase
        .from('documento_fiscal_itens')
        .insert(
          cart.map((item) => ({
            documento_id: doc.id,
            descricao: item.nome,
            codigo: item.sku || undefined,
            quantidade: item.quantidade,
            valor_unitario: item.preco,
            valor_total: item.preco * item.quantidade,
            unidade: 'UN',
            ncm: '22030000',
            cfop: '5102',
          }))
        );
      if (docItensErr) throw docItensErr;

      await new Promise((resolve) => setTimeout(resolve, 500));

      const { data: focusData, error: focusErr } = await supabase.functions.invoke(
        'focus-nfe',
        {
          body: { action: 'emitir_nfce', documento_id: doc.id, ambiente: 'PRODUCAO' },
        }
      );

      if (focusErr) throw new Error(focusErr.message);
      if (focusData && !focusData.success) throw new Error(focusData.error);

      toast({
        title: '🧾 Cupom Fiscal emitido!',
        description: `Pedido #${pedido.numero_pedido} finalizado com sucesso.`,
      });

      if (focusData?.danfe_url) {
        const url = focusData.danfe_url.startsWith('http')
          ? focusData.danfe_url
          : `https://api.focusnfe.com.br${focusData.danfe_url}`;
        setDanfeUrl(url);
      }

      setCart([]);
      setClienteId(null);
      setClienteNome('');
    } catch (error: any) {
      console.error('Erro PDV:', error);
      toast({
        title: 'Erro ao finalizar venda',
        description: error.message || 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsFinalizando(false);
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Products Grid — grouped by category */}
        <div className="lg:col-span-2 space-y-5">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar produto por nome ou categoria..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-11 h-11 rounded-xl"
            />
          </div>

          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-28 bg-muted/50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : categorizedProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Package className="h-12 w-12 mb-3 opacity-30" />
              <p>Nenhum produto encontrado</p>
            </div>
          ) : (
            <div className="space-y-6">
              {categorizedProducts.map(({ category, products }) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                    {category}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products.map((produto) => {
                      const inCart = cart.find((c) => c.produtoId === produto.id);
                      return (
                        <div
                          key={produto.id}
                          className="relative p-4 rounded-xl border border-border/50 bg-card hover:bg-accent/50 transition-colors text-left group"
                        >
                          {inCart && (
                            <Badge className="absolute -top-2 -right-2 h-6 w-6 p-0 flex items-center justify-center rounded-full text-xs">
                              {inCart.quantidade}
                            </Badge>
                          )}
                          <button
                            onClick={() => addToCart(produto)}
                            className="w-full text-left"
                          >
                            <p className="font-medium text-sm truncate">{produto.nome}</p>
                            <p className="text-primary font-bold mt-2">
                              R$ {produto.preco.toFixed(2)}
                            </p>
                          </button>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                              Estoque: {produto.estoque}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditEstoque(produto);
                              }}
                              title="Editar estoque"
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Cart Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingBag className="h-5 w-5" />
                Carrinho
                {cart.length > 0 && (
                  <Badge variant="secondary" className="ml-auto">
                    {cart.reduce((a, c) => a + c.quantidade, 0)} itens
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Clique nos produtos para adicionar
                </p>
              ) : (
                <ScrollArea className="max-h-[300px]">
                  <div className="space-y-2 pr-2">
                    {cart.map((item) => (
                      <div
                        key={item.produtoId}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {item.preco.toFixed(2)} × {item.quantidade}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQty(item.produtoId, -1)}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-sm font-medium w-6 text-center">
                            {item.quantidade}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => updateQty(item.produtoId, 1)}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-destructive"
                            onClick={() => removeFromCart(item.produtoId)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}

              <Separator />

              {/* Cliente */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" />
                  Cliente (opcional)
                </label>
                {clienteNome ? (
                  <div className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <span className="text-sm font-medium">{clienteNome}</span>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={clearCliente}>
                      Remover
                    </Button>
                  </div>
                ) : (
                  <div className="relative">
                    <Input
                      placeholder="Buscar cliente..."
                      value={clienteSearch}
                      onChange={(e) => searchCliente(e.target.value)}
                      className="h-8 text-sm"
                    />
                    {clienteResults.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-32 overflow-auto">
                        {clienteResults.map((c) => (
                          <button
                            key={c.id}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors"
                            onClick={() => selectCliente(c)}
                          >
                            {c.nome}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pagamento */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Pagamento</label>
                <Select value={metodoPagamento} onValueChange={setMetodoPagamento}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="pix">Pix</SelectItem>
                    <SelectItem value="cartao">Cartão</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Total */}
              <div className="flex items-center justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>

              {/* Finalizar */}
              <Button
                onClick={handleFinalizar}
                disabled={isFinalizando || cart.length === 0}
                className="w-full gap-2"
                size="lg"
              >
                {isFinalizando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Receipt className="h-5 w-5" />
                )}
                {isFinalizando ? 'Emitindo Cupom...' : 'Finalizar e Emitir Cupom'}
              </Button>
            </CardContent>
          </Card>

          {/* DANFE Viewer */}
          {danfeUrl && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center justify-between">
                  Cupom Fiscal
                  <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setDanfeUrl(null)}>
                    Fechar
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  src={danfeUrl}
                  className="w-full h-[400px] rounded-lg border"
                  title="Cupom Fiscal NFC-e"
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Edit Stock Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar Estoque</DialogTitle>
          </DialogHeader>
          {editingProduct && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{editingProduct.nome}</p>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Quantidade em estoque</label>
                <Input
                  type="number"
                  value={editEstoque}
                  onChange={(e) => setEditEstoque(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancelar</Button>
            <Button onClick={handleSaveEstoque} disabled={isSavingEstoque}>
              {isSavingEstoque ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
