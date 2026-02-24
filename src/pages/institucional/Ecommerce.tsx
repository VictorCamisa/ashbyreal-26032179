import { useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useInView, useMotionValue, useSpring } from 'framer-motion';
import {
  ShoppingCart, Plus, Minus, Trash2, MessageCircle, Search, ArrowLeft,
  Award, Star, Truck, Shield, Clock, Beer, Users, MapPin, Phone,
  Instagram, ChevronRight, Sparkles, X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
const INSTAGRAM_URL = 'https://www.instagram.com/taubatechopp/';
const ADDRESS = 'R. Dr. Emílio Winther, 1117 - Jardim das Nações, Taubaté - SP';
const PHONE_DISPLAY = '(12) 3432-6712';

// ── Animation variants ──
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }
  })
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

// ── Floating Orb ──
function FloatingOrb({ className, delay = 0, duration = 20 }: { className: string; delay?: number; duration?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className}`}
      animate={{
        x: [0, 30, -20, 10, 0],
        y: [0, -25, 15, -10, 0],
        scale: [1, 1.1, 0.95, 1.05, 1],
      }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}

// ── Wave Divider ──
function WaveDivider({ flip = false, className = '' }: { flip?: boolean; className?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''} ${className}`}>
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[60px] sm:h-[80px]">
        <path d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z" className="fill-[#0a0a0a]" />
      </svg>
    </div>
  );
}

// ── Section with reveal ──
function Section({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <section id={id} ref={ref} className={`relative overflow-hidden ${className}`}>
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}

// ── Animated Counter ──
function AnimatedCounter({ value, suffix = '' }: { value: string; suffix?: string }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="inline-block"
    >
      {value}{suffix}
    </motion.span>
  );
}

// ── Product metadata ──
interface ProductMeta { image: string; badge?: string; tagline: string; rating: number; }

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

interface CartItem { id: string; nome: string; preco: number; quantidade: number; }

// ── Testimonials ──
const testimonials = [
  { name: 'Ricardo Mendes', role: 'Evento Corporativo', text: 'Chopp gelado, atendimento impecável e entrega pontual. Superou expectativas!', rating: 5 },
  { name: 'Fernanda Lima', role: 'Casamento', text: 'O chopp Ashby foi um sucesso no casamento! Todos elogiaram.', rating: 5 },
  { name: 'João Paulo Silva', role: 'Churrasco', text: 'Qualidade excepcional! Entrega rápida e chopp perfeito. Virou tradição.', rating: 5 },
];

// ══════════════════════════════════════════════════════
// COMPONENT
// ══════════════════════════════════════════════════════
export default function Ecommerce() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Todos');
  const [cartOpen, setCartOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const heroScale = useTransform(scrollYProgress, [0, 0.15], [1.1, 1]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0.3]);
  const navBgOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

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

  // Featured products (first 3 with badges)
  const featuredProducts = useMemo(() => {
    return produtos.filter(p => {
      const meta = getProductMeta(p.nome);
      return !!meta.badge;
    }).slice(0, 4);
  }, [produtos]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white overflow-x-hidden">
      {/* ── Global floating orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <FloatingOrb className="w-[600px] h-[600px] bg-amber-500/[0.03] blur-[120px] top-[10%] -left-[200px]" delay={0} duration={25} />
        <FloatingOrb className="w-[500px] h-[500px] bg-amber-500/[0.04] blur-[100px] top-[40%] -right-[150px]" delay={5} duration={22} />
        <FloatingOrb className="w-[400px] h-[400px] bg-amber-500/[0.03] blur-[80px] top-[70%] left-[20%]" delay={10} duration={28} />
        <FloatingOrb className="w-[350px] h-[350px] bg-amber-600/[0.02] blur-[90px] top-[90%] right-[10%]" delay={15} duration={30} />
      </div>

      {/* ═══════════════════════════════════════
          NAVBAR
      ═══════════════════════════════════════ */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 border-b border-transparent"
        style={{
          backgroundColor: useTransform(navBgOpacity, v => `rgba(10,10,10,${0.5 + v * 0.45})`),
          borderColor: useTransform(navBgOpacity, v => `rgba(255,255,255,${v * 0.05})`),
          backdropFilter: 'blur(20px)',
        }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <motion.img
                src={logoTaubateChopp}
                alt="Taubaté Chopp"
                className="h-10 w-10 rounded-full object-cover ring-2 ring-amber-500/30 group-hover:ring-amber-500/60 transition-all"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300 }}
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
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
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
                  </motion.div>
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
                      <motion.div
                        animate={{ y: [0, -8, 0] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <ShoppingCart className="w-20 h-20 text-white/5 mb-4" />
                      </motion.div>
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
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button
                            className="w-full h-14 rounded-2xl bg-green-600 hover:bg-green-500 text-white font-bold text-base shadow-xl shadow-green-600/20 transition-all"
                            onClick={sendToWhatsApp}
                          >
                            <MessageCircle className="w-5 h-5 mr-2" />
                            Finalizar pelo WhatsApp
                          </Button>
                        </motion.div>
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
      </motion.nav>

      {/* ═══════════════════════════════════════
          HERO CINEMATOGRÁFICO
      ═══════════════════════════════════════ */}
      <section className="relative pt-16 min-h-[85vh] flex items-center overflow-hidden">
        <motion.div className="absolute inset-0" style={{ scale: heroScale }}>
          <img src={heroBg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a] via-[#0a0a0a]/80 to-[#0a0a0a]/30" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-[#0a0a0a]/50" />
          {/* Shimmer */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/[0.03] to-transparent"
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", repeatDelay: 3 }}
          />
        </motion.div>

        <motion.div style={{ opacity: heroOpacity }} className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24 w-full">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="max-w-2xl">
            <motion.div variants={fadeUp} custom={0}>
              <Badge className="mb-6 bg-amber-500/20 text-amber-300 border-amber-500/30 backdrop-blur-sm text-xs px-4 py-1.5">
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Award className="w-3.5 h-3.5 mr-1.5" />
                </motion.span>
                Distribuidor Oficial Ashby
              </Badge>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1} className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[0.9] tracking-tight mb-6">
              Chopp Ashby{' '}
              <motion.span
                className="bg-gradient-to-r from-amber-300 via-amber-400 to-amber-500 bg-clip-text text-transparent"
                animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
                style={{ backgroundSize: '200% 100%' }}
              >
                Premium
              </motion.span>
            </motion.h1>

            <motion.p variants={fadeUp} custom={2} className="text-white/50 text-base sm:text-lg max-w-lg mb-10 leading-relaxed">
              Selecione seus chopps favoritos e finalize seu pedido direto pelo WhatsApp.
              Entrega rápida em Taubaté e região.
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-wrap gap-3">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="rounded-full bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 shadow-xl shadow-amber-500/25 h-13"
                  onClick={() => document.getElementById('catalogo')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Beer className="w-4 h-4 mr-2" />
                  Ver Catálogo
                  <motion.span
                    className="ml-1"
                    animate={{ x: [0, 4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </motion.span>
                </Button>
              </motion.div>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 h-13 border-white/10 hover:border-amber-500/30 hover:bg-amber-500/5 text-white/80 transition-all"
                onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Vim pelo site e gostaria de fazer um pedido.')}`, '_blank')}
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Pedir pelo WhatsApp
              </Button>
            </motion.div>
          </motion.div>

          {/* Hero Stats */}
          <motion.div
            initial="hidden" animate="visible" variants={stagger}
            className="grid grid-cols-2 sm:grid-cols-4 gap-6 mt-16 pt-8 border-t border-white/5"
          >
            {[
              { value: '500+', label: 'Eventos atendidos' },
              { value: '7', label: 'Estilos de chopp' },
              { value: '4.9', label: 'Avaliação média' },
              { value: '30+', label: 'Anos Ashby' },
            ].map((stat, i) => (
              <motion.div key={stat.label} variants={fadeUp} custom={i} className="text-center sm:text-left">
                <div className="text-2xl sm:text-3xl font-black text-amber-400">
                  <AnimatedCounter value={stat.value} />
                </div>
                <div className="text-xs text-white/30 mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      <WaveDivider className="relative z-10 -mt-1" />

      {/* ═══════════════════════════════════════
          DESTAQUES
      ═══════════════════════════════════════ */}
      {featuredProducts.length > 0 && (
        <Section className="py-16 sm:py-24">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
              <motion.div variants={fadeUp}>
                <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs px-4 py-1">
                  <Sparkles className="w-3 h-3 mr-1.5" /> Destaques
                </Badge>
              </motion.div>
              <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black mb-3">
                Os Mais <span className="text-amber-400">Pedidos</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-white/40 max-w-md mx-auto">
                Os favoritos dos nossos clientes, com qualidade Ashby garantida.
              </motion.p>
            </motion.div>

            <motion.div
              variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
            >
              {featuredProducts.map((produto, i) => {
                const meta = getProductMeta(produto.nome);
                const volume = getVolume(produto.nome);
                return (
                  <motion.div key={produto.id} variants={fadeUp} custom={i}>
                    <motion.div
                      className="group relative rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] border border-white/[0.08] overflow-hidden"
                      whileHover={{ y: -8, scale: 1.02 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className="relative aspect-[4/5] overflow-hidden">
                        <img
                          src={meta.image}
                          alt={produto.nome}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                        {meta.badge && (
                          <Badge className="absolute top-3 left-3 bg-amber-500 text-black border-0 text-[10px] font-bold shadow-lg shadow-amber-500/30">
                            {meta.badge}
                          </Badge>
                        )}
                        {volume && (
                          <Badge className="absolute top-3 right-3 bg-black/60 text-white/90 border-0 text-[10px] backdrop-blur-md">
                            {volume}
                          </Badge>
                        )}
                      </div>
                      <div className="p-4">
                        <h3 className="font-bold text-sm text-white/90 group-hover:text-amber-400 transition-colors">{produto.nome}</h3>
                        <p className="text-xs text-white/35 mt-1">{meta.tagline}</p>
                        <div className="flex items-center justify-between mt-3">
                          <span className="text-xl font-black">R$ {produto.preco.toFixed(0)}</span>
                          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                            <Button
                              size="sm"
                              className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold h-9 text-xs gap-1.5 shadow-lg shadow-amber-500/20"
                              onClick={() => addToCart({ id: produto.id, nome: produto.nome, preco: produto.preco })}
                            >
                              <Plus className="w-3.5 h-3.5" /> Pedir
                            </Button>
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </Section>
      )}

      {/* ═══════════════════════════════════════
          FILTERS + CATALOG
      ═══════════════════════════════════════ */}
      <section id="catalogo" className="scroll-mt-20">
        {/* Sticky Filters */}
        <div className="sticky top-16 z-40 bg-[#0a0a0a]/90 backdrop-blur-2xl border-b border-white/5 py-4">
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
                  <motion.button
                    key={cat}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`px-4 py-2 rounded-full text-xs font-semibold shrink-0 transition-all ${
                      activeFilter === cat
                        ? 'bg-amber-500 text-black shadow-lg shadow-amber-500/20'
                        : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80'
                    }`}
                    onClick={() => setActiveFilter(cat)}
                  >
                    {cat}
                  </motion.button>
                ))}
              </div>
              <div className="hidden sm:block text-xs text-white/30 ml-auto font-medium">
                {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="py-10 sm:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {Array.from({ length: 8 }).map((_, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-2xl overflow-hidden"
                  >
                    <div className="aspect-[4/5] bg-white/5 animate-pulse" />
                    <div className="p-4 space-y-3">
                      <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-white/5 rounded animate-pulse w-1/2" />
                      <div className="h-8 bg-white/5 rounded animate-pulse w-1/3" />
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-50px" }}
                variants={stagger}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
              >
                {filteredProducts.map((produto, i) => {
                  const meta = getProductMeta(produto.nome);
                  const volume = getVolume(produto.nome);
                  const inCart = getCartItemQty(produto.id);
                  const estoque = produto.estoque ?? 0;
                  const emEstoque = estoque > 0;

                  return (
                    <motion.div
                      key={produto.id}
                      variants={fadeUp}
                      custom={i % 4}
                      layout
                    >
                      <motion.div
                        className="group relative rounded-2xl bg-white/[0.03] border border-white/[0.06] overflow-hidden hover:border-amber-500/20 transition-all duration-500"
                        whileHover={{ y: -4 }}
                        transition={{ type: "spring", stiffness: 400, damping: 25 }}
                      >
                        {/* Image */}
                        <div className="relative aspect-[4/5] overflow-hidden">
                          <img
                            src={meta.image}
                            alt={produto.nome}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />

                          {/* Badges */}
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
                          <AnimatePresence>
                            {inCart > 0 && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute bottom-3 right-3 bg-amber-500 text-black text-xs font-black rounded-full w-8 h-8 flex items-center justify-center shadow-lg shadow-amber-500/40"
                              >
                                {inCart}
                              </motion.div>
                            )}
                          </AnimatePresence>

                          {/* Stock & Rating */}
                          <div className="absolute bottom-3 left-3 right-12 flex items-center justify-between">
                            <div className="flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-1">
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                              <span className="text-[11px] font-semibold text-white/90">{meta.rating}</span>
                            </div>
                            <div className={`flex items-center gap-1 backdrop-blur-md rounded-full px-2.5 py-1 ${emEstoque ? 'bg-green-500/20' : 'bg-amber-500/20'}`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${emEstoque ? 'bg-green-400' : 'bg-amber-400'}`} />
                              <span className={`text-[10px] font-semibold ${emEstoque ? 'text-green-300' : 'text-amber-300'}`}>
                                {emEstoque ? `${estoque} un.` : 'Sob encomenda'}
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
                            <p className="text-xs text-white/35 mt-1 line-clamp-1">{meta.tagline}</p>
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
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  className="h-9 w-9 rounded-xl bg-white/10 hover:bg-white/15 flex items-center justify-center text-white/70 transition-colors"
                                  onClick={() => updateQuantity(produto.id, -1)}
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </motion.button>
                                <span className="text-sm font-bold w-5 text-center">{inCart}</span>
                                <motion.button
                                  whileTap={{ scale: 0.85 }}
                                  className="h-9 w-9 rounded-xl bg-amber-500 hover:bg-amber-400 flex items-center justify-center text-black transition-colors shadow-lg shadow-amber-500/20"
                                  onClick={() => updateQuantity(produto.id, 1)}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            ) : (
                              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.9 }}>
                                <Button
                                  size="sm"
                                  className="rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-bold h-9 text-xs gap-1.5 shadow-lg shadow-amber-500/20"
                                  onClick={() => addToCart({ id: produto.id, nome: produto.nome, preco: produto.preco })}
                                >
                                  <Plus className="w-3.5 h-3.5" /> Adicionar
                                </Button>
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  );
                })}
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-24"
              >
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Search className="w-16 h-16 mx-auto text-white/10 mb-4" />
                </motion.div>
                <h3 className="text-lg font-semibold mb-2 text-white/60">Nenhum produto encontrado</h3>
                <p className="text-sm text-white/30 mb-6">Tente ajustar sua busca ou filtro.</p>
                <Button
                  variant="outline"
                  className="rounded-full border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                  onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de saber mais sobre os chopps disponíveis.')}`, '_blank')}
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> Perguntar no WhatsApp
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <WaveDivider flip className="relative z-10" />

      {/* ═══════════════════════════════════════
          PROVA SOCIAL
      ═══════════════════════════════════════ */}
      <Section className="py-16 sm:py-24 bg-gradient-to-b from-transparent via-amber-500/[0.02] to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }} className="text-center mb-12">
            <motion.div variants={fadeUp}>
              <Badge className="mb-4 bg-amber-500/10 text-amber-400 border-amber-500/20 text-xs px-4 py-1">
                <Star className="w-3 h-3 mr-1.5 fill-amber-400" /> Avaliações
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl font-black mb-3">
              O que nossos <span className="text-amber-400">clientes</span> dizem
            </motion.h2>
            <motion.p variants={fadeUp} className="text-white/40 max-w-md mx-auto">
              Mais de 500 clientes satisfeitos em Taubaté e região.
            </motion.p>
          </motion.div>

          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid grid-cols-1 md:grid-cols-3 gap-6"
          >
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                variants={fadeUp}
                custom={i}
                className="relative p-6 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm hover:border-amber-500/20 transition-all duration-500 group"
              >
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-white/60 mb-4 leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/10 flex items-center justify-center text-amber-400 font-bold text-sm">
                    {t.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white/80">{t.name}</p>
                    <p className="text-xs text-white/30">{t.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      <WaveDivider className="relative z-10" />

      {/* ═══════════════════════════════════════
          TRUST PREMIUM
      ═══════════════════════════════════════ */}
      <Section className="py-16 sm:py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid grid-cols-1 sm:grid-cols-3 gap-6"
          >
            {[
              { icon: Truck, title: 'Entrega Rápida', desc: 'Taubaté e região com agilidade', stat: 'Mesmo dia' },
              { icon: Shield, title: 'Qualidade Ashby', desc: 'Cervejaria premiada internacionalmente', stat: 'Desde 1993' },
              { icon: Award, title: 'Distribuidor Oficial', desc: 'Produtos originais direto da fábrica', stat: '100% original' },
            ].map((item, i) => (
              <motion.div
                key={item.title}
                variants={fadeUp}
                custom={i}
                className="group text-center p-8 rounded-2xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm hover:border-amber-500/20 hover:bg-white/[0.05] transition-all duration-500"
              >
                <motion.div
                  className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 mb-4 group-hover:bg-amber-500/20 transition-colors"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <item.icon className="w-6 h-6 text-amber-400" />
                </motion.div>
                <h4 className="text-sm font-bold text-white/80 mb-1">{item.title}</h4>
                <p className="text-xs text-white/30 mb-3">{item.desc}</p>
                <span className="text-xs font-bold text-amber-400/80">{item.stat}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
          CTA FINAL
      ═══════════════════════════════════════ */}
      <Section className="py-16 sm:py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7 }}
            className="relative rounded-3xl overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-400" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgwLDAsMCwwLjA1KSIvPjwvc3ZnPg==')] opacity-50" />
            <div className="relative p-8 sm:p-12 text-center">
              <motion.div
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <MessageCircle className="w-12 h-12 mx-auto mb-4 text-black/70" />
              </motion.div>
              <h3 className="text-2xl sm:text-3xl font-black text-black mb-3">
                Não encontrou o que procura?
              </h3>
              <p className="text-black/60 text-sm sm:text-base max-w-md mx-auto mb-8">
                Fale diretamente com a gente! Temos condições especiais para eventos e pedidos em grande quantidade.
              </p>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="rounded-full bg-black hover:bg-black/80 text-amber-400 font-bold px-10 h-14 shadow-xl text-base"
                  onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de um atendimento personalizado.')}`, '_blank')}
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  Falar no WhatsApp
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </Section>

      {/* ═══════════════════════════════════════
          FOOTER COMPLETO
      ═══════════════════════════════════════ */}
      <footer className="border-t border-white/5 pt-16 pb-8 relative">
        <FloatingOrb className="w-[300px] h-[300px] bg-amber-500/[0.02] blur-[80px] bottom-0 left-[10%]" delay={0} duration={20} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={logoTaubateChopp} alt="Taubaté Chopp" className="h-10 w-10 rounded-full object-cover ring-2 ring-amber-500/20" />
                <div>
                  <span className="text-sm font-bold text-white block">TAUBATÉ CHOPP</span>
                  <span className="text-[10px] text-amber-400/60 tracking-widest uppercase">Distribuidor Ashby</span>
                </div>
              </div>
              <p className="text-xs text-white/30 leading-relaxed">
                Distribuidor oficial da Cervejaria Ashby em Taubaté e região do Vale do Paraíba.
              </p>
            </div>

            {/* Links */}
            <div>
              <h5 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-4">Navegação</h5>
              <div className="space-y-2">
                <Link to="/" className="block text-sm text-white/30 hover:text-amber-400 transition-colors">Página Inicial</Link>
                <Link to="/produtos" className="block text-sm text-white/30 hover:text-amber-400 transition-colors">Catálogo Completo</Link>
                <Link to="/auth" className="block text-sm text-white/30 hover:text-amber-400 transition-colors">Área do Cliente</Link>
              </div>
            </div>

            {/* Contato */}
            <div>
              <h5 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-4">Contato</h5>
              <div className="space-y-3">
                <a href={`tel:${PHONE_DISPLAY.replace(/\D/g, '')}`} className="flex items-center gap-2 text-sm text-white/30 hover:text-amber-400 transition-colors">
                  <Phone className="w-3.5 h-3.5" /> {PHONE_DISPLAY}
                </a>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-white/30 hover:text-amber-400 transition-colors">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-white/30 hover:text-amber-400 transition-colors">
                  <Instagram className="w-3.5 h-3.5" /> @taubatechopp
                </a>
              </div>
            </div>

            {/* Endereço */}
            <div>
              <h5 className="text-xs font-bold text-white/60 uppercase tracking-wider mb-4">Localização</h5>
              <div className="flex items-start gap-2 text-sm text-white/30">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{ADDRESS}</span>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm text-white/30">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Seg-Sáb: 8h às 18h</span>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xs text-white/20">© 2025 Taubaté Chopp — Distribuidor Oficial Ashby. Todos os direitos reservados.</span>
            <span className="text-xs text-white/20">Beba com moderação</span>
          </div>
        </div>
      </footer>

      {/* ═══════════════════════════════════════
          FLOATING CART (MOBILE)
      ═══════════════════════════════════════ */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-6 left-4 right-4 z-50 sm:hidden"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full h-14 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-bold text-sm shadow-2xl shadow-amber-500/40 flex items-center justify-between px-5 transition-all"
              onClick={() => setCartOpen(true)}
            >
              <span className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Ver Carrinho ({cartCount})
              </span>
              <span className="font-black text-base">R$ {cartTotal.toFixed(2)}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
