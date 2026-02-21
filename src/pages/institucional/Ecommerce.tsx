import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Search,
  ArrowLeft,
  ChevronRight,
  Award,
  Star,
  Truck,
  Shield,
  Clock,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import logoTaubateChopp from '@/assets/logo-taubate-chopp.jpeg';
import heroBg from '@/assets/ecommerce-hero.jpg';
import imgPilsen from '@/assets/chopp-pilsen.jpg';
import imgIpa from '@/assets/chopp-ipa.jpg';
import imgEscuro from '@/assets/chopp-escuro.jpg';
import imgWeiss from '@/assets/chopp-weiss.jpg';
import imgAle from '@/assets/chopp-ale.jpg';
import imgVinho from '@/assets/chopp-vinho.jpg';
import imgPuroMalte from '@/assets/chopp-puromalte.jpg';

const WHATSAPP_NUMBER = '551234326712';

interface ProductMeta {
  image: string;
  badge?: string;
  tagline: string;
  rating: number;
}

const productImageMap: Record<string, ProductMeta> = {
  'pilsen': { image: imgPilsen, badge: 'Mais Vendido', tagline: 'Clássica, leve e refrescante', rating: 4.8 },
  'puro malte': { image: imgPuroMalte, tagline: '100% malte de cevada', rating: 4.7 },
  'escuro': { image: imgEscuro, tagline: 'Notas de caramelo e tostado', rating: 4.6 },
  'ipa': { image: imgIpa, badge: 'Intensa', tagline: 'Lúpulos cítricos e amargor marcante', rating: 4.9 },
  'ale': { image: imgAle, badge: 'Premiada', tagline: 'Frutada e equilibrada', rating: 4.8 },
  'weiss': { image: imgWeiss, tagline: 'Trigo com banana e cravo', rating: 4.5 },
  'vinho': { image: imgVinho, badge: 'Exclusivo', tagline: 'Inovação com notas de vinho', rating: 4.7 },
};

function getProductMeta(name: string): ProductMeta {
  const lower = name.toLowerCase();
  for (const [key, meta] of Object.entries(productImageMap)) {
    if (lower.includes(key)) return meta;
  }
  return { image: imgPilsen, tagline: 'Chopp artesanal Ashby', rating: 4.5 };
}

function getProductType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('ipa') || lower.includes('ale') || lower.includes('weiss')) return 'Especiais';
  if (lower.includes('vinho')) return 'Exclusivos';
  return 'Clássicos';
}

function getVolume(name: string): string {
  if (name.includes('50')) return '50L';
  if (name.includes('30')) return '30L';
  return '';
}

interface CartItem {
  id: string;
  nome: string;
  preco: number;
  quantidade: number;
}

export default function Ecommerce() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [cartOpen, setCartOpen] = useState(false);

  const { data: produtos = [], isLoading } = useQuery({
    queryKey: ['produtos-ecommerce'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, nome, preco, categoria, tipo_produto, estoque')
        .eq('ativo', true)
        .eq('tipo_produto', 'CHOPP')
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  const categories = ['Todos', 'Clássicos', 'Especiais', 'Exclusivos'];

  const filteredProducts = useMemo(() => {
    return produtos.filter(p => {
      const matchesSearch = p.nome.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = activeFilter === 'Todos' || getProductType(p.nome) === activeFilter;
      return matchesSearch && matchesCategory;
    });
  }, [produtos, searchTerm, activeFilter]);

  const cartTotal = cart.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantidade, 0);

  const addToCart = (produto: { id: string; nome: string; preco: number }) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === produto.id);
      if (existing) return prev.map(i => i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      return [...prev, { ...produto, quantidade: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => prev.map(i => {
      if (i.id !== id) return i;
      const newQty = i.quantidade + delta;
      return newQty > 0 ? { ...i, quantidade: newQty } : i;
    }).filter(i => i.quantidade > 0));
  };

  const removeFromCart = (id: string) => setCart(prev => prev.filter(i => i.id !== id));

  const sendToWhatsApp = () => {
    if (cart.length === 0) return;
    const items = cart.map(i => `• ${i.quantidade}x ${i.nome} - R$ ${(i.preco * i.quantidade).toFixed(2)}`).join('\n');
    const message = encodeURIComponent(
      `🛒 *Pedido via Ecommerce - Taubaté Chopp*\n\n${items}\n\n💰 *Total: R$ ${cartTotal.toFixed(2)}*\n\nGostaria de finalizar este pedido!`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  const getCartItemQty = (id: string) => cart.find(i => i.id === id)?.quantidade || 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ─── NAVBAR ─── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-2xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <img
                src={logoTaubateChopp}
                alt="Taubaté Chopp"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-amber-500/30 group-hover:ring-amber-500/60 transition-all"
              />
              <div className="hidden sm:block">
                <span className="text-sm font-bold tracking-tight text-white">TAUBATÉ CHOPP</span>
                <span className="text-[10px] text-amber-400/80 block tracking-widest uppercase">Distribuidor Ashby</span>
              </div>
            </Link>

            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="sm" className="rounded-full text-xs text-white/60 hover:text-white hover:bg-white/5">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  Voltar
                </Button>
              </Link>

              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" className="rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold relative gap-2 shadow-lg shadow-amber-500/20">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs">Carrinho</span>
                    {cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-black rounded-full w-5 h-5 flex items-center justify-center shadow-md"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md flex flex-col bg-[#111] border-white/5 text-white">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2 text-white">
                      <ShoppingCart className="w-5 h-5 text-amber-400" />
                      Seu Carrinho ({cartCount})
                    </SheetTitle>
                  </SheetHeader>

                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <ShoppingCart className="w-20 h-20 text-white/5 mb-4" />
                      <h3 className="font-semibold text-lg mb-1 text-white/80">Carrinho vazio</h3>
                      <p className="text-sm text-white/40">Adicione chopps para continuar</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 overflow-y-auto space-y-3 py-4">
                        <AnimatePresence>
                          {cart.map(item => {
                            const meta = getProductMeta(item.nome);
                            return (
                              <motion.div
                                key={item.id}
                                layout
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5"
                              >
                                <img src={meta.image} alt={item.nome} className="w-14 h-14 rounded-lg object-cover" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate text-white/90">{item.nome}</p>
                                  <p className="text-xs text-white/40">
                                    R$ {item.preco.toFixed(2)} × {item.quantidade} = <span className="text-amber-400 font-semibold">R$ {(item.preco * item.quantidade).toFixed(2)}</span>
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-white/60 hover:text-white hover:bg-white/10" onClick={() => updateQuantity(item.id, -1)}>
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="text-sm font-bold w-6 text-center">{item.quantidade}</span>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-white/60 hover:text-white hover:bg-white/10" onClick={() => updateQuantity(item.id, 1)}>
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10" onClick={() => removeFromCart(item.id)}>
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      <div className="border-t border-white/10 pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-white/50">Total do pedido</span>
                          <span className="text-3xl font-black text-amber-400">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                        <Button
                          className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-base shadow-xl shadow-green-600/20 transition-all"
                          onClick={sendToWhatsApp}
                        >
                          <MessageCircle className="w-5 h-5 mr-2" />
                          Finalizar pelo WhatsApp
                        </Button>
                        <p className="text-[10px] text-white/30 text-center">
                          Você será redirecionado para confirmar no WhatsApp
                        </p>
                      </div>
                    </>
                  )}
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </nav>

      {/* ─── HERO ─── */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0a]/70 via-[#0a0a0a]/50 to-[#0a0a0a]" />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-2xl"
          >
            <Badge className="mb-6 bg-amber-500/20 text-amber-300 border-amber-500/30 backdrop-blur-sm text-xs px-3 py-1">
              <Award className="w-3.5 h-3.5 mr-1.5" />
              Distribuidor Oficial Ashby
            </Badge>
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[0.9] tracking-tight mb-6">
              Chopp Ashby{' '}
              <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent">
                Premium
              </span>
            </h1>
            <p className="text-white/50 text-base sm:text-lg max-w-lg mb-8 leading-relaxed">
              Selecione seus chopps favoritos e finalize seu pedido direto pelo WhatsApp. 
              Entrega rápida em Taubaté e região.
            </p>
            <div className="flex flex-wrap gap-6 text-xs text-white/40">
              <span className="flex items-center gap-2"><Truck className="w-4 h-4 text-amber-400" /> Entrega rápida</span>
              <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-amber-400" /> Qualidade garantida</span>
              <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-amber-400" /> Chopp sempre gelado</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── FILTERS ─── */}
      <section className="sticky top-16 z-40 bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-white/5 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                placeholder="Buscar chopps..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-transparent transition-all"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto scrollbar-none w-full sm:w-auto">
              {categories.map(cat => (
                <button
                  key={cat}
                  className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all ${
                    activeFilter === cat
                      ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                      : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                  }`}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="hidden sm:block text-xs text-white/30 ml-auto font-medium">
              {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRODUCTS GRID ─── */}
      <section className="py-10 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{ hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
            >
              {filteredProducts.map(produto => {
                const meta = getProductMeta(produto.nome);
                const volume = getVolume(produto.nome);
                const inCart = getCartItemQty(produto.id);
                const estoque = produto.estoque ?? 0;
                const emEstoque = estoque > 0;

                return (
                  <motion.div
                    key={produto.id}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                    layout
                  >
                    <div className="group relative rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:border-amber-500/20 hover:bg-white/[0.05] transition-all duration-500">
                      {/* Image */}
                      <div className="relative aspect-[4/5] overflow-hidden">
                        <img
                          src={meta.image}
                          alt={produto.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                        
                        {/* Top badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-start justify-between">
                          {meta.badge && (
                            <Badge className="bg-amber-500 text-black border-0 text-[10px] font-bold shadow-lg shadow-amber-500/30 px-2.5">
                              {meta.badge}
                            </Badge>
                          )}
                          {volume && (
                            <Badge className="bg-black/60 text-white/90 border-0 text-[10px] backdrop-blur-md ml-auto">
                              {volume}
                            </Badge>
                          )}
                        </div>

                        {/* Cart indicator */}
                        {inCart > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute bottom-3 right-3 bg-amber-500 text-black text-xs font-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg shadow-amber-500/40"
                          >
                            {inCart}
                          </motion.div>
                        )}

                        {/* Stock & Rating */}
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
                          <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-[11px] font-semibold text-white/90">{meta.rating}</span>
                          </div>
                          <div className={`flex items-center gap-1 backdrop-blur-md rounded-full px-2.5 py-1 ${emEstoque ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${emEstoque ? 'bg-green-400' : 'bg-red-400'}`} />
                            <span className={`text-[10px] font-semibold ${emEstoque ? 'text-green-300' : 'text-red-300'}`}>
                              {emEstoque ? `${estoque} em estoque` : 'Sob encomenda'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-bold text-sm text-white/90 group-hover:text-amber-400 transition-colors line-clamp-1">
                            {produto.nome}
                          </h3>
                          <p className="text-xs text-white/35 mt-1 line-clamp-1">
                            {meta.tagline}
                          </p>
                        </div>

                        <div className="flex items-end justify-between pt-1">
                          <div>
                            <span className="text-xs text-white/30 block">A partir de</span>
                            <span className="text-2xl font-black text-white">
                              R$ {produto.preco.toFixed(0)}
                              <span className="text-sm font-medium text-white/40">,{(produto.preco % 1).toFixed(2).slice(2)}</span>
                            </span>
                          </div>

                          {inCart > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 transition-colors"
                                onClick={() => updateQuantity(produto.id, -1)}
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-bold w-5 text-center">{inCart}</span>
                              <button
                                className="h-9 w-9 rounded-xl bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-black transition-colors shadow-lg shadow-amber-500/20"
                                onClick={() => updateQuantity(produto.id, 1)}
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold h-9 text-xs gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
                              onClick={() => addToCart({ id: produto.id, nome: produto.nome, preco: produto.preco })}
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Adicionar
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          ) : (
            <div className="text-center py-24">
              <Search className="w-16 h-16 mx-auto text-white/10 mb-4" />
              <h3 className="text-lg font-semibold mb-1 text-white/60">Nenhum produto encontrado</h3>
              <p className="text-sm text-white/30">Tente ajustar sua busca ou filtro.</p>
            </div>
          )}
        </div>
      </section>

      {/* ─── TRUST BANNER ─── */}
      <section className="py-12 border-t border-white/5">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 mb-2">
                <Truck className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-sm font-bold text-white/80">Entrega Rápida</h4>
              <p className="text-xs text-white/30">Taubaté e região com agilidade</p>
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 mb-2">
                <Shield className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-sm font-bold text-white/80">Qualidade Ashby</h4>
              <p className="text-xs text-white/30">Cervejaria premiada internacionalmente</p>
            </div>
            <div className="space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-amber-500/10 mb-2">
                <Award className="w-5 h-5 text-amber-400" />
              </div>
              <h4 className="text-sm font-bold text-white/80">Distribuidor Oficial</h4>
              <p className="text-xs text-white/30">Produtos originais direto da fábrica</p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FLOATING CART (MOBILE) ─── */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-50 sm:hidden"
          >
            <button
              className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm shadow-2xl shadow-amber-500/40 flex items-center justify-between px-5 transition-all"
              onClick={() => setCartOpen(true)}
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Ver Carrinho ({cartCount})
              </span>
              <span className="font-black text-base">R$ {cartTotal.toFixed(2)}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── FOOTER ─── */}
      <footer className="py-8 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logoTaubateChopp} alt="Taubaté Chopp" className="h-8 w-8 rounded-full object-cover ring-1 ring-amber-500/20" />
              <span className="text-xs text-white/30">© 2025 Taubaté Chopp — Distribuidor Oficial Ashby</span>
            </div>
            <div className="flex items-center gap-4">
              <Link to="/" className="text-xs text-white/30 hover:text-amber-400 transition-colors">Início</Link>
              <Link to="/produtos" className="text-xs text-white/30 hover:text-amber-400 transition-colors">Catálogo</Link>
              <Link to="/auth" className="text-xs text-white/30 hover:text-amber-400 transition-colors">Sistema</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
