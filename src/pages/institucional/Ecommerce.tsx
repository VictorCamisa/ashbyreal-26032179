import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Beer,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  MessageCircle,
  Search,
  ArrowLeft,
  X,
  ChevronRight,
  Sparkles,
  Award,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import logoTaubateChopp from '@/assets/logo-taubate-chopp.jpeg';

const WHATSAPP_NUMBER = '551234326712';

// Map product names to emojis and metadata
const productMeta: Record<string, { emoji: string; color: string; badge?: string; description: string }> = {
  'pilsen': { emoji: '🍺', color: 'from-amber-400/30 to-yellow-500/20', badge: 'Mais Vendido', description: 'Leve, refrescante e com sabor suave. A clássica Pilsen Ashby.' },
  'puro malte': { emoji: '🌾', color: 'from-yellow-400/30 to-amber-500/20', description: 'Produzida 100% com malte de cevada. Sabor encorpado e aromático.' },
  'escuro': { emoji: '🍫', color: 'from-amber-600/30 to-amber-800/20', description: 'Notas de caramelo e tostado leve com final refrescante.' },
  'ipa': { emoji: '🌟', color: 'from-orange-500/30 to-red-500/20', badge: 'Intensa', description: 'Notas cítricas intensas e amargor marcante. Lúpulos americanos.' },
  'ale': { emoji: '🏆', color: 'from-orange-400/30 to-amber-500/20', badge: 'Premiada', description: 'Amargor equilibrado e notas frutadas. Um clássico premiado.' },
  'weiss': { emoji: '🍌', color: 'from-yellow-300/30 to-amber-400/20', description: 'Cerveja de trigo com aromas de banana e cravo. Leve e refrescante.' },
  'vinho branco': { emoji: '🍷', color: 'from-yellow-200/30 to-amber-300/20', badge: 'Especial', description: 'Chopp com notas de vinho branco. Inovador e surpreendente.' },
  'vinho tinto': { emoji: '🍇', color: 'from-purple-400/30 to-red-400/20', badge: 'Especial', description: 'Chopp com notas de vinho tinto. Uma experiência única.' },
};

function getProductMeta(name: string) {
  const lower = name.toLowerCase();
  for (const [key, meta] of Object.entries(productMeta)) {
    if (lower.includes(key)) return meta;
  }
  return { emoji: '🍺', color: 'from-amber-400/30 to-amber-500/20', description: 'Chopp artesanal Ashby de qualidade premiada.' };
}

function getProductType(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes('pilsen') && !lower.includes('puro') && !lower.includes('escuro')) return 'Pilsen';
  if (lower.includes('puro malte')) return 'Pilsen';
  if (lower.includes('escuro')) return 'Pilsen';
  if (lower.includes('ipa')) return 'Especiais';
  if (lower.includes('ale')) return 'Especiais';
  if (lower.includes('weiss')) return 'Especiais';
  if (lower.includes('vinho')) return 'Exclusivos';
  return 'Outros';
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

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

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
        .select('id, nome, preco, categoria, tipo_produto')
        .eq('ativo', true)
        .eq('tipo_produto', 'CHOPP')
        .order('nome');
      if (error) throw error;
      return data || [];
    },
  });

  const categories = ['Todos', 'Pilsen', 'Especiais', 'Exclusivos'];

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
      if (existing) {
        return prev.map(i => i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i);
      }
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

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(i => i.id !== id));
  };

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
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <motion.img
                src={logoTaubateChopp}
                alt="Taubaté Chopp"
                className="h-9 w-9 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all"
                whileHover={{ scale: 1.1 }}
              />
              <div className="hidden sm:block">
                <span className="text-base font-bold tracking-tight">Taubaté Chopp</span>
                <span className="text-[10px] text-muted-foreground block -mt-0.5">Ecommerce</span>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Link to="/">
                <Button variant="ghost" size="sm" className="rounded-full text-xs">
                  <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                  Início
                </Button>
              </Link>

              <Sheet open={cartOpen} onOpenChange={setCartOpen}>
                <SheetTrigger asChild>
                  <Button size="sm" className="rounded-full bg-primary hover:bg-primary/90 text-primary-foreground relative gap-2">
                    <ShoppingCart className="w-4 h-4" />
                    <span className="hidden sm:inline text-xs font-semibold">Carrinho</span>
                    {cartCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center"
                      >
                        {cartCount}
                      </motion.span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-md flex flex-col">
                  <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-primary" />
                      Seu Carrinho ({cartCount})
                    </SheetTitle>
                  </SheetHeader>

                  {cart.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                      <ShoppingCart className="w-16 h-16 text-muted-foreground/20 mb-4" />
                      <h3 className="font-semibold text-lg mb-1">Carrinho vazio</h3>
                      <p className="text-sm text-muted-foreground">Adicione produtos para continuar</p>
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
                                className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50"
                              >
                                <span className="text-2xl">{meta.emoji}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold truncate">{item.nome}</p>
                                  <p className="text-xs text-muted-foreground">
                                    R$ {item.preco.toFixed(2)} × {item.quantidade}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 rounded-lg"
                                    onClick={() => updateQuantity(item.id, -1)}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="text-sm font-bold w-6 text-center">{item.quantidade}</span>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 rounded-lg"
                                    onClick={() => updateQuantity(item.id, 1)}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-7 w-7 rounded-lg text-destructive"
                                    onClick={() => removeFromCart(item.id)}
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </Button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </AnimatePresence>
                      </div>

                      <div className="border-t border-border pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total</span>
                          <span className="text-2xl font-bold">R$ {cartTotal.toFixed(2)}</span>
                        </div>
                        <Button
                          className="w-full h-12 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold text-base shadow-lg"
                          onClick={sendToWhatsApp}
                        >
                          <MessageCircle className="w-5 h-5 mr-2" />
                          Finalizar via WhatsApp
                        </Button>
                        <p className="text-[10px] text-muted-foreground text-center">
                          Você será redirecionado para o WhatsApp para confirmar o pedido
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

      {/* Hero Banner */}
      <section className="pt-20 pb-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="text-center py-8">
            <motion.div variants={fadeIn}>
              <Badge variant="outline" className="mb-4 border-primary/30 text-primary bg-primary/10 text-xs">
                <Award className="w-3.5 h-3.5 mr-1.5" />
                Distribuidor Oficial Ashby
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeIn} className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3">
              Chopp Ashby <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">Online</span>
            </motion.h1>
            <motion.p variants={fadeIn} className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
              Escolha seus chopps favoritos e finalize pelo WhatsApp. Entrega rápida em Taubaté e região.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border/30 py-3">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar chopps..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-10 h-9 rounded-xl text-sm"
              />
            </div>
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none w-full sm:w-auto">
              {categories.map(cat => (
                <Button
                  key={cat}
                  variant={activeFilter === cat ? 'default' : 'ghost'}
                  size="sm"
                  className={`rounded-full text-xs shrink-0 ${activeFilter === cat ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => setActiveFilter(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
            <div className="hidden sm:block text-xs text-muted-foreground ml-auto">
              {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-72 rounded-2xl bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <motion.div initial="hidden" animate="visible" variants={stagger} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map(produto => {
                const meta = getProductMeta(produto.nome);
                const volume = getVolume(produto.nome);
                const inCart = getCartItemQty(produto.id);

                return (
                  <motion.div key={produto.id} variants={fadeIn} layout>
                    <div className="group relative rounded-2xl border border-border/50 bg-card overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300">
                      {/* Product Image */}
                      <div className={`relative h-36 bg-gradient-to-br ${meta.color} flex items-center justify-center overflow-hidden`}>
                        <motion.span
                          className="text-6xl"
                          whileHover={{ scale: 1.2, rotate: 8 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          {meta.emoji}
                        </motion.span>
                        {meta.badge && (
                          <Badge className="absolute top-3 right-3 bg-primary text-primary-foreground border-0 text-[10px] shadow-md">
                            {meta.badge}
                          </Badge>
                        )}
                        {volume && (
                          <Badge variant="outline" className="absolute top-3 left-3 bg-background/80 backdrop-blur-sm text-[10px] border-border/50">
                            {volume}
                          </Badge>
                        )}
                        {inCart > 0 && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="absolute bottom-3 right-3 bg-primary text-primary-foreground text-xs font-bold rounded-full w-7 h-7 flex items-center justify-center shadow-lg"
                          >
                            {inCart}
                          </motion.div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4 space-y-3">
                        <div>
                          <h3 className="font-bold text-sm group-hover:text-primary transition-colors line-clamp-1">
                            {produto.nome}
                          </h3>
                          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                            {meta.description}
                          </p>
                        </div>

                        <div className="flex items-end justify-between">
                          <div>
                            <span className="text-xl font-bold text-foreground">
                              R$ {produto.preco.toFixed(2)}
                            </span>
                          </div>

                          {inCart > 0 ? (
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8 rounded-lg"
                                onClick={() => updateQuantity(produto.id, -1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="text-sm font-bold w-6 text-center">{inCart}</span>
                              <Button
                                size="icon"
                                className="h-8 w-8 rounded-lg bg-primary text-primary-foreground"
                                onClick={() => updateQuantity(produto.id, 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              className="rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground h-8 text-xs gap-1.5"
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
            <div className="text-center py-20">
              <Beer className="w-16 h-16 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Nenhum produto encontrado</h3>
              <p className="text-sm text-muted-foreground">Tente ajustar sua busca ou filtro.</p>
            </div>
          )}
        </div>
      </section>

      {/* Floating cart button (mobile) */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-4 right-4 z-50 sm:hidden"
          >
            <Button
              className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-base shadow-2xl shadow-primary/30"
              onClick={() => setCartOpen(true)}
            >
              <ShoppingCart className="w-5 h-5 mr-3" />
              Ver Carrinho ({cartCount})
              <ChevronRight className="w-5 h-5 ml-auto" />
              <span className="ml-2 font-bold">R$ {cartTotal.toFixed(2)}</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="py-8 border-t border-border/30 mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={logoTaubateChopp} alt="Taubaté Chopp" className="h-8 w-8 rounded-full object-cover ring-1 ring-primary/20" />
              <span className="text-xs text-muted-foreground">Taubaté Chopp - Distribuidor Oficial Ashby</span>
            </div>
            <div className="flex items-center gap-3">
              <Link to="/" className="text-xs text-muted-foreground hover:text-primary transition-colors">Início</Link>
              <Link to="/produtos" className="text-xs text-muted-foreground hover:text-primary transition-colors">Catálogo</Link>
              <Link to="/auth" className="text-xs text-muted-foreground hover:text-primary transition-colors">Sistema</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
