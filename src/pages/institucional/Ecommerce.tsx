import { useState, useMemo, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useInView } from 'framer-motion';
import {
  ShoppingCart, Plus, Minus, Trash2, MessageCircle, Search, ArrowLeft,
  Award, Star, Truck, Shield, Clock, Beer, MapPin, Phone,
  Instagram, ChevronDown, X, ArrowRight, Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
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

// ── Product metadata ──
interface ProductMeta { image: string; badge?: string; tagline: string; rating: number; color: string; }

const productImageMap: Record<string, ProductMeta> = {
  'pilsen': { image: imgPilsen, badge: 'Mais Vendido', tagline: 'Clássica, leve e refrescante', rating: 4.8, color: '#F59E0B' },
  'puro malte': { image: imgPuroMalte, tagline: '100% malte de cevada', rating: 4.7, color: '#D97706' },
  'escuro': { image: imgEscuro, tagline: 'Notas de caramelo e tostado', rating: 4.6, color: '#78350F' },
  'ipa': { image: imgIpa, badge: 'Intensa', tagline: 'Lúpulos cítricos e amargor marcante', rating: 4.9, color: '#059669' },
  'ale': { image: imgAle, badge: 'Premiada', tagline: 'Frutada e equilibrada', rating: 4.8, color: '#DC2626' },
  'weiss': { image: imgWeiss, tagline: 'Trigo com banana e cravo', rating: 4.5, color: '#F5E6D3' },
  'vinho': { image: imgVinho, badge: 'Exclusivo', tagline: 'Inovação com notas de vinho', rating: 4.7, color: '#7C3AED' },
};

function getProductMeta(name: string): ProductMeta {
  const lower = name.toLowerCase();
  for (const [key, meta] of Object.entries(productImageMap)) {
    if (lower.includes(key)) return meta;
  }
  return { image: imgPilsen, tagline: 'Chopp artesanal Ashby', rating: 4.5, color: '#F59E0B' };
}

function getVolume(name: string): string {
  if (name.includes('50')) return '50L';
  if (name.includes('30')) return '30L';
  return '';
}

interface CartItem { id: string; nome: string; preco: number; quantidade: number; }

const testimonials = [
  { name: 'Ricardo M.', event: 'Corporativo', text: 'Superou todas as expectativas. Chopp perfeito.', stars: 5 },
  { name: 'Fernanda L.', event: 'Casamento', text: 'O destaque do nosso casamento. Todos elogiaram.', stars: 5 },
  { name: 'João Paulo S.', event: 'Churrasco', text: 'Qualidade excepcional. Virou tradição na família.', stars: 5 },
];

// ── Reveal wrapper ──
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 50 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ── Marquee ──
function Marquee({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden whitespace-nowrap">
      <motion.div
        className="inline-flex gap-12"
        animate={{ x: ['0%', '-50%'] }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
export default function Ecommerce() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [cartOpen, setCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll();
  const heroImgY = useTransform(scrollYProgress, [0, 0.3], ['0%', '20%']);
  const heroTextY = useTransform(scrollYProgress, [0, 0.3], [0, -80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);
  const navBorder = useTransform(scrollYProgress, [0.02, 0.06], [0, 1]);

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

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return produtos;
    return produtos.filter(p => p.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [produtos, searchTerm]);

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
      `🍺 *Pedido — Taubaté Chopp*\n\n${items}\n\n💰 *Total: R$ ${cartTotal.toFixed(2)}*\n\nGostaria de finalizar!`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  const getCartQty = (id: string) => cart.find(i => i.id === id)?.quantidade || 0;

  return (
    <div className="min-h-screen bg-[#060606] text-white selection:bg-amber-500/30">

      {/* ═══ NAVBAR — Minimal, editorial ═══ */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50 mix-blend-difference"
        style={{ borderBottomWidth: 1, borderColor: useTransform(navBorder, v => `rgba(255,255,255,${v * 0.06})`) }}
      >
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 flex items-center justify-between h-[60px]">
          <Link to="/" className="flex items-center gap-2.5 group">
            <img src={logoTaubateChopp} alt="Taubaté Chopp" className="h-8 w-8 rounded-full object-cover" />
            <span className="text-[11px] font-medium tracking-[0.2em] uppercase">Taubaté Chopp</span>
          </Link>

          <div className="flex items-center gap-5">
            <Link to="/" className="text-[11px] tracking-[0.15em] uppercase opacity-50 hover:opacity-100 transition-opacity hidden sm:block">
              Home
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              className="relative flex items-center gap-2 text-[11px] tracking-[0.15em] uppercase"
            >
              Sacola
              {cartCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="flex items-center justify-center w-5 h-5 rounded-full bg-white text-black text-[10px] font-bold"
                >
                  {cartCount}
                </motion.span>
              )}
            </button>
          </div>
        </div>
      </motion.nav>

      {/* ═══ HERO — Full-bleed editorial ═══ */}
      <section ref={heroRef} className="relative h-screen flex items-end overflow-hidden">
        <motion.div className="absolute inset-0" style={{ y: heroImgY }}>
          <img src={heroBg} alt="" className="w-full h-[120%] object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060606] via-[#060606]/40 to-transparent" />
          <div className="absolute inset-0 bg-[#060606]/30" />
        </motion.div>

        <motion.div
          style={{ y: heroTextY, opacity: heroOpacity }}
          className="relative z-10 w-full max-w-[1400px] mx-auto px-5 sm:px-8 pb-16 sm:pb-24"
        >
          <div className="flex flex-col gap-6 max-w-3xl">
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.3 }}
              className="text-[11px] tracking-[0.3em] uppercase text-amber-400/80 font-medium"
            >
              Distribuidor Oficial Ashby — Desde 1993
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2.5rem,8vw,7rem)] font-extralight leading-[0.9] tracking-[-0.03em]"
            >
              Chopp
              <br />
              <span className="font-bold italic">Premium</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.8 }}
              className="text-white/40 text-base sm:text-lg max-w-md leading-relaxed font-light"
            >
              Selecione, peça e receba. A primeira microcervejaria do Brasil direto na sua mesa.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="absolute bottom-8 right-8 hidden sm:flex flex-col items-center gap-2"
          >
            <span className="text-[10px] tracking-[0.2em] uppercase text-white/30">Scroll</span>
            <motion.div animate={{ y: [0, 8, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <ChevronDown className="w-4 h-4 text-white/30" />
            </motion.div>
          </motion.div>
        </motion.div>
      </section>

      {/* ═══ MARQUEE — Running text strip ═══ */}
      <div className="border-y border-white/[0.06] py-4 bg-[#060606]">
        <Marquee>
          {['Pilsen', 'IPA Nirvana', 'Pale Ale', 'Weiss', 'Chopp Escuro', 'Puro Malte', 'Chopp de Vinho'].map(name => (
            <span key={name} className="text-[11px] tracking-[0.25em] uppercase text-white/20 flex items-center gap-3">
              <span className="w-1 h-1 rounded-full bg-amber-500/40" />
              {name}
            </span>
          ))}
        </Marquee>
      </div>

      {/* ═══ EDITORIAL INTRO ═══ */}
      <section className="py-24 sm:py-32">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <p className="text-[11px] tracking-[0.3em] uppercase text-amber-400/60 mb-6">Nossa Coleção</p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extralight leading-[1.1] tracking-[-0.02em] mb-8">
                Sete estilos,<br />
                <span className="font-bold">uma tradição.</span>
              </h2>
              <p className="text-white/30 text-base leading-relaxed max-w-md font-light">
                Cada chopp Ashby carrega mais de 30 anos de dedicação cervejeira.
                Da leveza da Pilsen à ousadia do Chopp de Vinho, encontre o seu favorito.
              </p>
            </Reveal>
            <Reveal delay={0.2}>
              <div className="grid grid-cols-3 gap-3">
                {[imgPilsen, imgIpa, imgAle, imgEscuro, imgWeiss, imgVinho].map((img, i) => (
                  <motion.div
                    key={i}
                    className="aspect-[3/4] rounded-xl overflow-hidden"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </motion.div>
                ))}
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ═══ CATALOG — The Shop ═══ */}
      <section id="catalogo" className="pb-24 sm:pb-32">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8">
          {/* Section header + search */}
          <Reveal>
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6 mb-12 border-b border-white/[0.06] pb-8">
              <div>
                <p className="text-[11px] tracking-[0.3em] uppercase text-amber-400/60 mb-3">Catálogo</p>
                <h2 className="text-3xl sm:text-4xl font-extralight tracking-[-0.02em]">
                  Escolha seus <span className="font-bold">chopps</span>
                </h2>
              </div>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                <input
                  placeholder="Buscar..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full h-11 pl-11 pr-4 rounded-full bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-amber-500/40 transition-colors"
                />
              </div>
            </div>
          </Reveal>

          {/* Products */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="aspect-[16/9] bg-white/[0.02] animate-pulse rounded-sm" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-[1px] bg-white/[0.04] rounded-xl overflow-hidden">
              {filteredProducts.map((produto, i) => {
                const meta = getProductMeta(produto.nome);
                const volume = getVolume(produto.nome);
                const inCart = getCartQty(produto.id);
                const estoque = produto.estoque ?? 0;

                return (
                  <Reveal key={produto.id} delay={i * 0.05}>
                    <motion.div
                      className="relative bg-[#060606] group cursor-pointer"
                      whileHover="hover"
                      onClick={() => setSelectedProduct(selectedProduct === produto.id ? null : produto.id)}
                    >
                      <div className="flex flex-col sm:flex-row">
                        {/* Image */}
                        <div className="relative w-full sm:w-[45%] aspect-[4/3] sm:aspect-auto overflow-hidden">
                          <motion.img
                            src={meta.image}
                            alt={produto.nome}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            variants={{ hover: { scale: 1.08 } }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-[#060606]/80 hidden sm:block" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#060606]/80 to-transparent sm:hidden" />

                          {/* Badges */}
                          {meta.badge && (
                            <div className="absolute top-4 left-4">
                              <span className="text-[9px] tracking-[0.2em] uppercase font-bold px-3 py-1.5 rounded-full"
                                style={{ backgroundColor: meta.color + '22', color: meta.color, border: `1px solid ${meta.color}33` }}>
                                {meta.badge}
                              </span>
                            </div>
                          )}

                          {/* Cart badge */}
                          <AnimatePresence>
                            {inCart > 0 && (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-amber-500 text-black text-xs font-bold flex items-center justify-center"
                              >
                                {inCart}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Info */}
                        <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between min-h-[200px]">
                          <div>
                            <div className="flex items-center gap-3 mb-3">
                              {volume && (
                                <span className="text-[10px] tracking-[0.15em] uppercase text-white/25 border border-white/10 rounded-full px-2.5 py-0.5">
                                  {volume}
                                </span>
                              )}
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 fill-amber-400/60 text-amber-400/60" />
                                <span className="text-[11px] text-white/30">{meta.rating}</span>
                              </div>
                            </div>
                            <h3 className="text-xl sm:text-2xl font-light tracking-[-0.01em] mb-2 group-hover:text-amber-400/90 transition-colors duration-500">
                              {produto.nome}
                            </h3>
                            <p className="text-sm text-white/25 font-light leading-relaxed">{meta.tagline}</p>
                          </div>

                          <div className="flex items-end justify-between mt-6">
                            <div>
                              <span className="text-[10px] text-white/20 block mb-1 uppercase tracking-wider">Preço</span>
                              <span className="text-3xl font-extralight tracking-tight">
                                R${produto.preco.toFixed(0)}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {inCart > 0 ? (
                                <div className="flex items-center gap-1.5 bg-white/[0.04] rounded-full px-1 py-1">
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-white/[0.1] flex items-center justify-center transition-colors"
                                    onClick={(e) => { e.stopPropagation(); updateQuantity(produto.id, -1); }}
                                  >
                                    <Minus className="w-3 h-3" />
                                  </motion.button>
                                  <span className="text-sm font-medium w-6 text-center">{inCart}</span>
                                  <motion.button
                                    whileTap={{ scale: 0.85 }}
                                    className="w-8 h-8 rounded-full bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center transition-colors"
                                    onClick={(e) => { e.stopPropagation(); updateQuantity(produto.id, 1); }}
                                  >
                                    <Plus className="w-3 h-3" />
                                  </motion.button>
                                </div>
                              ) : (
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  className="h-10 px-5 rounded-full bg-white/[0.06] hover:bg-amber-500 hover:text-black text-sm font-medium flex items-center gap-2 transition-all duration-300 border border-white/[0.08] hover:border-amber-500"
                                  onClick={(e) => { e.stopPropagation(); addToCart({ id: produto.id, nome: produto.nome, preco: produto.preco }); }}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  Adicionar
                                </motion.button>
                              )}
                            </div>
                          </div>

                          {/* Stock indicator */}
                          <div className="mt-4 pt-4 border-t border-white/[0.04]">
                            <div className="flex items-center gap-2">
                              <div className={`w-1.5 h-1.5 rounded-full ${estoque > 0 ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                              <span className="text-[10px] tracking-[0.1em] uppercase text-white/20">
                                {estoque > 0 ? `${estoque} em estoque` : 'Sob encomenda'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Reveal>
                );
              })}
            </div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-32">
              <Search className="w-12 h-12 mx-auto text-white/[0.06] mb-6" />
              <p className="text-white/30 text-sm font-light mb-6">Nenhum resultado para "{searchTerm}"</p>
              <button
                onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de saber sobre os chopps disponíveis.')}`, '_blank')}
                className="text-[11px] tracking-[0.2em] uppercase text-amber-400/60 hover:text-amber-400 transition-colors inline-flex items-center gap-2"
              >
                Perguntar no WhatsApp <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </div>
      </section>

      {/* ═══ SOCIAL PROOF — Minimal editorial ═══ */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <Reveal>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-16">
              <div>
                <p className="text-[11px] tracking-[0.3em] uppercase text-amber-400/60 mb-6">Depoimentos</p>
                <h2 className="text-3xl sm:text-4xl font-extralight tracking-[-0.02em] mb-4">
                  Quem prova,<br /><span className="font-bold">recomenda.</span>
                </h2>
                <div className="flex items-center gap-2 mt-6">
                  <div className="flex -space-x-1">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-sm text-white/30 font-light">4.9 média</span>
                </div>
                <p className="text-white/20 text-sm font-light mt-2">+500 clientes atendidos</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-[1px] bg-white/[0.04] rounded-xl overflow-hidden">
                {testimonials.map((t, i) => (
                  <Reveal key={t.name} delay={i * 0.1}>
                    <div className="bg-[#060606] p-8 h-full flex flex-col justify-between min-h-[220px]">
                      <p className="text-sm text-white/40 font-light leading-relaxed italic">
                        "{t.text}"
                      </p>
                      <div className="mt-6 pt-4 border-t border-white/[0.04]">
                        <p className="text-sm font-medium text-white/70">{t.name}</p>
                        <p className="text-[10px] tracking-[0.15em] uppercase text-white/20 mt-1">{t.event}</p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ TRUST — Horizontal strip ═══ */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.06]">
            {[
              { icon: Truck, label: 'Entrega', desc: 'Mesmo dia em Taubaté' },
              { icon: Shield, label: 'Qualidade', desc: 'Ashby premiada mundial' },
              { icon: Award, label: 'Oficial', desc: '100% original de fábrica' },
            ].map((item, i) => (
              <Reveal key={item.label} delay={i * 0.1}>
                <div className="px-8 py-10 flex items-center gap-5 group">
                  <div className="w-12 h-12 rounded-full border border-white/[0.08] flex items-center justify-center group-hover:border-amber-500/30 group-hover:bg-amber-500/[0.04] transition-all duration-500">
                    <item.icon className="w-5 h-5 text-white/30 group-hover:text-amber-400/80 transition-colors duration-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white/70">{item.label}</p>
                    <p className="text-[11px] text-white/20 font-light">{item.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA — Big editorial block ═══ */}
      <section className="border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-24 sm:py-32">
          <Reveal>
            <div className="text-center max-w-xl mx-auto">
              <p className="text-[11px] tracking-[0.3em] uppercase text-amber-400/60 mb-8">Atendimento</p>
              <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extralight tracking-[-0.03em] leading-[1.1] mb-8">
                Não encontrou?<br />
                <span className="font-bold italic">Fale conosco.</span>
              </h2>
              <p className="text-white/25 font-light text-base mb-10 leading-relaxed">
                Condições especiais para eventos, festas e pedidos em grande quantidade.
              </p>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="h-14 px-10 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-semibold text-sm inline-flex items-center gap-3 shadow-2xl shadow-amber-500/20 transition-colors"
                onClick={() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de um atendimento personalizado.')}`, '_blank')}
              >
                <MessageCircle className="w-5 h-5" />
                Falar no WhatsApp
              </motion.button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ FOOTER — Clean editorial ═══ */}
      <footer className="border-t border-white/[0.06]">
        <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src={logoTaubateChopp} alt="" className="h-9 w-9 rounded-full object-cover" />
                <div>
                  <span className="text-[11px] tracking-[0.2em] uppercase font-medium block">Taubaté Chopp</span>
                  <span className="text-[9px] tracking-[0.15em] uppercase text-amber-400/40">Distribuidor Ashby</span>
                </div>
              </div>
              <p className="text-xs text-white/15 leading-relaxed font-light">
                Distribuidor oficial da Cervejaria Ashby em Taubaté e região do Vale do Paraíba.
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-5">Links</p>
              <div className="space-y-3">
                <Link to="/" className="block text-sm text-white/20 hover:text-white/60 transition-colors font-light">Home</Link>
                <Link to="/produtos" className="block text-sm text-white/20 hover:text-white/60 transition-colors font-light">Produtos</Link>
                <Link to="/auth" className="block text-sm text-white/20 hover:text-white/60 transition-colors font-light">Área do Cliente</Link>
              </div>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-5">Contato</p>
              <div className="space-y-3">
                <a href={`tel:${PHONE_DISPLAY.replace(/\D/g, '')}`} className="flex items-center gap-2.5 text-sm text-white/20 hover:text-white/60 transition-colors font-light">
                  <Phone className="w-3.5 h-3.5" /> {PHONE_DISPLAY}
                </a>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-white/20 hover:text-white/60 transition-colors font-light">
                  <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                </a>
                <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-sm text-white/20 hover:text-white/60 transition-colors font-light">
                  <Instagram className="w-3.5 h-3.5" /> @taubatechopp
                </a>
              </div>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.2em] uppercase text-white/30 mb-5">Localização</p>
              <div className="flex items-start gap-2.5 text-sm text-white/20 font-light">
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span>{ADDRESS}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-white/20 font-light mt-3">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>Seg — Sáb: 8h às 18h</span>
              </div>
            </div>
          </div>
          <div className="border-t border-white/[0.04] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[10px] text-white/10 tracking-wider">© 2025 Taubaté Chopp. Todos os direitos reservados.</span>
            <span className="text-[10px] text-white/10 tracking-wider">Beba com moderação</span>
          </div>
        </div>
      </footer>

      {/* ═══ CART SHEET ═══ */}
      <Sheet open={cartOpen} onOpenChange={setCartOpen}>
        <SheetContent className="w-full sm:max-w-[420px] flex flex-col bg-[#0a0a0a] border-white/[0.04] text-white p-0">
          <div className="px-6 pt-6 pb-4 border-b border-white/[0.04]">
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between text-white">
                <span className="text-[11px] tracking-[0.2em] uppercase font-medium">
                  Sacola ({cartCount})
                </span>
              </SheetTitle>
            </SheetHeader>
          </div>

          {cart.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
              <ShoppingCart className="w-12 h-12 text-white/[0.06] mb-6" />
              <p className="text-sm text-white/30 font-light">Sua sacola está vazia</p>
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
                <AnimatePresence>
                  {cart.map(item => {
                    const meta = getProductMeta(item.nome);
                    return (
                      <motion.div
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0 }}
                        className="flex items-center gap-4"
                      >
                        <img src={meta.image} alt={item.nome} className="w-16 h-16 rounded-lg object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.nome}</p>
                          <p className="text-xs text-white/25 mt-0.5">
                            R$ {item.preco.toFixed(2)} × {item.quantidade}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                            onClick={() => updateQuantity(item.id, -1)}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-medium w-5 text-center">{item.quantidade}</span>
                          <button
                            className="w-7 h-7 rounded-full bg-white/[0.04] hover:bg-white/[0.08] flex items-center justify-center transition-colors"
                            onClick={() => updateQuantity(item.id, 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            className="w-7 h-7 rounded-full hover:bg-red-500/10 flex items-center justify-center text-white/20 hover:text-red-400 transition-colors ml-1"
                            onClick={() => removeFromCart(item.id)}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
              <div className="px-6 py-5 border-t border-white/[0.04] space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] tracking-[0.15em] uppercase text-white/30">Total</span>
                  <span className="text-2xl font-extralight">R$ {cartTotal.toFixed(2)}</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full h-13 rounded-full bg-[#25D366] hover:bg-[#20BD5A] text-white font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors"
                  onClick={sendToWhatsApp}
                >
                  <MessageCircle className="w-4.5 h-4.5" />
                  Finalizar pelo WhatsApp
                </motion.button>
                <p className="text-[10px] text-white/10 text-center">Redirecionamento para confirmar no WhatsApp</p>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* ═══ FLOATING CART — Mobile ═══ */}
      <AnimatePresence>
        {cartCount > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-5 left-4 right-4 z-50 sm:hidden"
          >
            <motion.button
              whileTap={{ scale: 0.97 }}
              className="w-full h-[52px] rounded-full bg-white text-black font-medium text-sm flex items-center justify-between px-5 shadow-2xl shadow-black/50"
              onClick={() => setCartOpen(true)}
            >
              <span className="flex items-center gap-2.5">
                <ShoppingCart className="w-4 h-4" />
                Ver sacola ({cartCount})
              </span>
              <span className="font-bold">R$ {cartTotal.toFixed(2)}</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
