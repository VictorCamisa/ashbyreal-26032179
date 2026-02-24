import { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform, useInView, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { 
  Beer, Award, Truck, Clock, ChevronRight, Star, MapPin, Phone, Mail,
  MessageCircle, Calculator, Users, Minus, Plus, Send, Instagram,
  Loader2, ShoppingCart, ArrowDown, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logoTaubateChopp from '@/assets/logo-taubate-chopp.jpeg';
import choppPilsen from '@/assets/chopp-pilsen.jpg';
import choppAle from '@/assets/chopp-ale.jpg';
import choppIpa from '@/assets/chopp-ipa.jpg';
import choppWeiss from '@/assets/chopp-weiss.jpg';

const PHONE_NUMBER = '+55 12 3432-6712';
const WHATSAPP_NUMBER = '551234326712';
const INSTAGRAM_URL = 'https://www.instagram.com/taubatechopp/';
const ADDRESS = 'R. Dr. Emílio Winther, 1117 - Jardim das Nações, Taubaté - SP';

// ── Animation variants ──
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }
  })
};

const fadeIn = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.12, delayChildren: 0.15 } }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

const slideFromLeft = {
  hidden: { opacity: 0, x: -60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
};

const slideFromRight = {
  hidden: { opacity: 0, x: 60 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
};

// ── Floating orb for backgrounds ──
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

// ── Section wrapper with reveal + parallax ──
function Section({ children, className = '', id, overflow = true }: { children: React.ReactNode; className?: string; id?: string; overflow?: boolean }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], [30, -30]);

  return (
    <section id={id} ref={ref} className={`relative scroll-mt-20 ${overflow ? 'overflow-hidden' : ''} ${className}`}>
      <motion.div style={{ y: bgY }} className="absolute inset-0 pointer-events-none" aria-hidden>
        {/* Slot for bg elements rendered inside children */}
      </motion.div>
      <motion.div
        className="relative z-10"
        initial={{ opacity: 0, y: 20 }}
        animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </section>
  );
}

// ── Magnetic hover effect ──
function MagneticWrap({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 200, damping: 20 });
  const springY = useSpring(y, { stiffness: 200, damping: 20 });

  return (
    <motion.div
      className={className}
      style={{ x: springX, y: springY }}
      onMouseMove={(e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - rect.left - rect.width / 2) * 0.15);
        y.set((e.clientY - rect.top - rect.height / 2) * 0.15);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}
    >
      {children}
    </motion.div>
  );
}

// ── Smooth divider wave ──
function WaveDivider({ flip = false, className = '' }: { flip?: boolean; className?: string }) {
  return (
    <div className={`w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''} ${className}`}>
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-full h-[60px] sm:h-[80px]">
        <path
          d="M0,60 C200,100 400,20 600,60 C800,100 1000,20 1200,60 L1200,120 L0,120 Z"
          className="fill-background"
        />
      </svg>
    </div>
  );
}

// ── Typewriter hook ──
const PHRASES = [
  'Chopp premium para seu evento',
  'A tradição Ashby na sua festa',
  'Entrega rápida em Taubaté e região',
  'Em breve novidades...',
  'Mas um spoiler: teremos muita CERVEJA por aqui 🍺',
  'Distribuidor oficial Ashby',
  'Qualidade que transforma eventos',
];

function useTypewriter(phrases: string[], typeSpeed = 60, deleteSpeed = 30, pauseTime = 2000) {
  const [text, setText] = useState('');
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const currentPhrase = phrases[phraseIndex];
    
    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setText(currentPhrase.slice(0, text.length + 1));
        if (text.length + 1 === currentPhrase.length) {
          setTimeout(() => setIsDeleting(true), pauseTime);
        }
      } else {
        setText(currentPhrase.slice(0, text.length - 1));
        if (text.length === 0) {
          setIsDeleting(false);
          setPhraseIndex((prev) => (prev + 1) % phrases.length);
        }
      }
    }, isDeleting ? deleteSpeed : typeSpeed);

    return () => clearTimeout(timeout);
  }, [text, isDeleting, phraseIndex, phrases, typeSpeed, deleteSpeed, pauseTime]);

  return text;
}

const products = [
  { name: 'Pilsen Clássica', desc: 'Leveza e refrescância com sabor autêntico.', tag: 'Mais Vendido', image: choppPilsen },
  { name: 'Pale Ale', desc: 'Eleita melhor do mundo em 2017. Amargor equilibrado.', tag: 'Premiada', image: choppAle },
  { name: 'IPA Nirvana', desc: 'Notas cítricas intensas e amargor marcante.', tag: 'Especial', image: choppIpa },
  { name: 'Weiss', desc: 'Suave e refrescante, aroma de banana e cravo.', tag: null, image: choppWeiss },
];

const stats = [
  { value: '500+', label: 'Eventos realizados' },
  { value: '30+', label: 'Anos de tradição Ashby' },
  { value: '7', label: 'Dias de atendimento' },
  { value: '4.9', label: 'Avaliação média' },
];

const testimonials = [
  { name: 'Ricardo Mendes', role: 'Evento Corporativo', text: 'Chopp gelado, atendimento impecável e entrega pontual. Superou expectativas!' },
  { name: 'Fernanda Lima', role: 'Casamento', text: 'O chopp Ashby foi um sucesso no casamento! Todos elogiaram. Muito profissional.' },
  { name: 'João Paulo Silva', role: 'Churrasco em Família', text: 'Qualidade excepcional! Entrega rápida e chopp perfeito. Virou tradição.' },
];

const faqItems = [
  { q: 'Qual a quantidade ideal por pessoa?', a: 'Recomendamos ~1L por pessoa para eventos de 4h. Para eventos mais longos, considere 1,5L. Use nossa calculadora!' },
  { q: 'Vocês alugam chopeiras?', a: 'Sim! Oferecemos aluguel de chopeiras elétricas portáteis que mantêm o chopp na temperatura ideal.' },
  { q: 'Qual o prazo de entrega?', a: 'Entregas em Taubaté e região podem ser no mesmo dia para pedidos até 14h.' },
  { q: 'Como funciona a devolução de barris?', a: 'Sistema consignado: você deixa uma garantia pelos barris e recebe o estorno ao devolvê-los.' },
  { q: 'Quais formas de pagamento?', a: 'Pix, cartão de crédito (até 3x sem juros), débito e dinheiro.' },
  { q: 'O chopp é realmente Ashby?', a: 'Sim! Somos distribuidores oficiais da Cervejaria Ashby, a primeira microcervejaria do Brasil.' },
];

export default function InstitucionalHome() {
  const { toast } = useToast();
  const [numPessoas, setNumPessoas] = useState(50);
  const [duracao, setDuracao] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nome: '', telefone: '', email: '', tipoEvento: '', dataEvento: '', mensagem: '' });
  const [hoveredProduct, setHoveredProduct] = useState<number | null>(null);

  const { scrollYProgress } = useScroll();
  const navBg = useTransform(scrollYProgress, [0, 0.05], [0, 1]);
  const heroParallax = useTransform(scrollYProgress, [0, 0.3], [0, -60]);
  const typedText = useTypewriter(PHRASES, 55, 25, 2200);

  const litrosPorPessoa = duracao <= 3 ? 0.8 : duracao <= 5 ? 1.0 : 1.5;
  const totalLitros = Math.ceil(numPessoas * litrosPorPessoa);
  const barris30L = Math.ceil(totalLitros / 30);

  // ── Business logic (unchanged) ──
  const handleWhatsApp = async () => {
    if (!formData.nome || !formData.telefone) {
      toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Preencha nome e telefone.' });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data: existingClient } = await supabase.from('clientes').select('id').eq('telefone', formData.telefone).maybeSingle();
      let clienteId = existingClient?.id;
      if (!clienteId) {
        const { data: newClient, error: clientError } = await supabase.from('clientes').insert({
          nome: formData.nome, telefone: formData.telefone,
          email: formData.email || `${formData.telefone}@site.taubatechopp.com.br`,
          origem: 'Site', status: 'lead',
          observacoes: `Evento: ${formData.tipoEvento || '-'}\nData: ${formData.dataEvento || '-'}\nMsg: ${formData.mensagem || '-'}`
        }).select('id').single();
        if (clientError) throw clientError;
        clienteId = newClient.id;
      }
      await supabase.from('leads').insert({
        cliente_id: clienteId, nome: formData.nome, telefone: formData.telefone,
        email: formData.email || null, origem: 'Site', status: 'novo_lead',
        valor_estimado: totalLitros * 15,
        observacoes: `Evento: ${formData.tipoEvento || '-'}\nData: ${formData.dataEvento || '-'}\nEst: ${totalLitros}L (${barris30L} barris)\nMsg: ${formData.mensagem || '-'}`
      });
      toast({ title: 'Dados salvos!', description: 'Redirecionando para WhatsApp...' });
      const message = encodeURIComponent(
        `Olá! Vim pelo site:\n*Nome:* ${formData.nome}\n*Tel:* ${formData.telefone}\n` +
        (formData.tipoEvento ? `*Evento:* ${formData.tipoEvento}\n` : '') +
        `*Estimativa:* ${totalLitros}L (${barris30L} barris)\n` +
        (formData.mensagem ? `*Msg:* ${formData.mensagem}` : '')
      );
      setTimeout(() => window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank'), 800);
      setFormData({ nome: '', telefone: '', email: '', tipoEvento: '', dataEvento: '', mensagem: '' });
    } catch (error) {
      console.error('Error:', error);
      const message = encodeURIComponent(`Olá! Gostaria de orçamento:\nNome: ${formData.nome}\nTel: ${formData.telefone}`);
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── Global floating ambient orbs (behind everything) ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <FloatingOrb className="w-[600px] h-[600px] bg-primary/[0.04] blur-[120px] top-[10%] -left-[200px]" delay={0} duration={25} />
        <FloatingOrb className="w-[500px] h-[500px] bg-primary/[0.05] blur-[100px] top-[40%] -right-[150px]" delay={5} duration={22} />
        <FloatingOrb className="w-[400px] h-[400px] bg-primary/[0.03] blur-[80px] top-[70%] left-[20%]" delay={10} duration={28} />
      </div>

      {/* ── Navbar ── */}
      <motion.nav
        className="fixed top-0 left-0 right-0 z-50"
        style={{
          backgroundColor: useTransform(navBg, (v) => `hsl(var(--background) / ${0.5 + v * 0.45})`),
          backdropFilter: 'blur(24px)',
        }}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.img
              src={logoTaubateChopp} alt="Taubaté Chopp"
              className="h-8 w-8 rounded-full object-cover ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300"
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
            />
            <span className="font-semibold text-sm tracking-tight hidden sm:block text-foreground/90">Taubaté Chopp</span>
          </Link>
          <div className="hidden md:flex items-center">
            {['produtos', 'calculadora', 'sobre', 'faq', 'contato'].map((s) => (
              <a key={s} href={`#${s}`}
                className="relative px-4 py-2 text-xs font-medium text-muted-foreground/70 hover:text-foreground tracking-wide uppercase transition-colors duration-300 group"
              >
                {s}
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-0 h-px bg-primary group-hover:w-3/4 transition-all duration-300" />
              </a>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Link to="/ecommerce">
              <Button variant="ghost" size="sm" className="text-muted-foreground/60 hover:text-foreground text-xs gap-1.5">
                <ShoppingCart className="w-3.5 h-3.5" /> Loja
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="sm" className="bg-foreground text-background font-medium rounded-full px-5 text-xs hover:bg-foreground/90 transition-all duration-300 h-8">
                Sistema
              </Button>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* ══════════════════════════════════════════════════
          HERO — Minimal, abstract, modern
      ══════════════════════════════════════════════════ */}
      <section className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Abstract background */}
        <div className="absolute inset-0">
          {/* Gradient mesh */}
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/[0.08]" />
          
          {/* Floating abstract shapes */}
          <motion.div
            className="absolute top-1/4 right-[15%] w-[400px] h-[400px] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%)',
            }}
            animate={{ 
              scale: [1, 1.2, 1],
              x: [0, 20, 0],
              y: [0, -15, 0],
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute bottom-1/4 left-[10%] w-[300px] h-[300px] rounded-full"
            style={{
              background: 'radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%)',
            }}
            animate={{ 
              scale: [1, 1.15, 1],
              x: [0, -15, 0],
              y: [0, 20, 0],
            }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          />
          
          {/* Subtle grain texture overlay */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }} />

          {/* Thin decorative lines */}
          <motion.div 
            className="absolute top-[30%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
          <motion.div 
            className="absolute top-[70%] left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/5 to-transparent"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 2, delay: 1, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <motion.div style={{ y: heroParallax }} className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <motion.div initial="hidden" animate="visible" variants={stagger}>
            {/* Badge */}
            <motion.div variants={fadeUp} custom={0} className="flex justify-center mb-8">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium tracking-wider">
                <Sparkles className="w-3 h-3" />
                DISTRIBUIDOR OFICIAL ASHBY
              </div>
            </motion.div>

            {/* Typewriter text */}
            <motion.div variants={fadeUp} custom={1} className="min-h-[120px] sm:min-h-[160px] md:min-h-[200px] flex items-center justify-center">
              <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-foreground">
                {typedText}
                <motion.span
                  className="inline-block w-[3px] h-[0.85em] bg-primary ml-1 align-middle"
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, ease: "steps(1)" }}
                />
              </h1>
            </motion.div>

            {/* Subtitle */}
            <motion.p variants={fadeUp} custom={2}
              className="text-base sm:text-lg text-muted-foreground/70 max-w-lg mx-auto mb-12 leading-relaxed font-light"
            >
              A qualidade da primeira microcervejaria do Brasil — 
              direto para a sua festa.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-3 justify-center">
              <MagneticWrap>
                <Button
                  size="lg"
                  className="bg-foreground text-background font-semibold px-8 h-12 rounded-full hover:bg-foreground/90 active:scale-[0.98] transition-all duration-300 text-sm"
                  onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Solicitar Orçamento
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </MagneticWrap>
              <Button
                size="lg"
                variant="outline"
                className="rounded-full px-8 h-12 border-border/50 hover:border-foreground/20 hover:bg-foreground/5 transition-all duration-300 text-sm font-medium"
                onClick={() => document.getElementById('calculadora')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Calculator className="mr-2 w-4 h-4" />
                Calcular Quantidade
              </Button>
            </motion.div>
          </motion.div>

          {/* Stats — minimal inline */}
          <motion.div
            initial="hidden" animate="visible" variants={stagger}
            className="flex flex-wrap justify-center gap-8 sm:gap-12 mt-20 pt-8 border-t border-border/20"
          >
            {stats.map((s, i) => (
              <motion.div key={s.label} variants={fadeUp} custom={i} className="text-center group cursor-default">
                <p className="text-2xl sm:text-3xl font-bold text-foreground/90 group-hover:text-primary transition-colors duration-300 tabular-nums">
                  {s.value}
                </p>
                <p className="text-xs text-muted-foreground/50 mt-1 tracking-wide">{s.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="flex flex-col items-center gap-2 text-muted-foreground/30"
          >
            <span className="text-[10px] uppercase tracking-[0.25em] font-light">Scroll</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </motion.div>
        </motion.div>
      </section>

      {/* ══════════════════════════════════════════════════
          DIFERENCIAIS — warm glow bg
      ══════════════════════════════════════════════════ */}
      <div className="relative">
        <WaveDivider flip className="-mb-px" />
        <Section className="py-20 sm:py-28 bg-gradient-to-b from-primary/[0.04] via-primary/[0.02] to-transparent">
          {/* Decorative orbs */}
          <FloatingOrb className="w-[300px] h-[300px] bg-primary/[0.06] blur-[80px] -top-20 right-[10%]" delay={2} duration={18} />
          <FloatingOrb className="w-[200px] h-[200px] bg-primary/[0.04] blur-[60px] bottom-0 left-[5%]" delay={7} duration={15} />
          
          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger}
              className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8"
            >
              {[
                { icon: Award, title: 'Qualidade Premiada', desc: 'Primeira microcervejaria do Brasil com prêmios internacionais.' },
                { icon: Truck, title: 'Entrega Rápida', desc: 'Taubaté e região com agilidade e pontualidade.' },
                { icon: Clock, title: 'Atendimento 7 dias', desc: 'Suporte completo, segunda a domingo.' },
                { icon: Beer, title: 'Variedade', desc: 'Pilsen, Pale Ale, IPA, Weiss e mais.' },
              ].map((d, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}
                  className="group cursor-default rounded-2xl p-6 bg-card/50 backdrop-blur-sm border border-border/30 hover:border-primary/30 hover:bg-card/80 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500"
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <motion.div
                    className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 group-hover:shadow-lg group-hover:shadow-primary/10 transition-all duration-300"
                    whileHover={{ rotate: [0, -5, 5, 0] }}
                    transition={{ duration: 0.4 }}
                  >
                    <d.icon className="w-6 h-6 text-primary" />
                  </motion.div>
                  <h3 className="font-bold text-foreground mb-1 group-hover:text-primary transition-colors duration-300">{d.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Section>
      </div>

      {/* ══════════════════════════════════════════════════
          PRODUTOS — dark rich section
      ══════════════════════════════════════════════════ */}
      <Section id="produtos" className="py-24 sm:py-32 bg-gradient-to-b from-background via-muted/40 to-background">
        <FloatingOrb className="w-[350px] h-[350px] bg-primary/[0.05] blur-[100px] top-[20%] -left-[100px]" delay={3} duration={20} />
        <FloatingOrb className="w-[250px] h-[250px] bg-primary/[0.04] blur-[70px] bottom-[10%] right-[5%]" delay={8} duration={16} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mb-14">
            <motion.p variants={fadeIn} className="text-primary font-semibold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
              <motion.span
                className="w-8 h-px bg-primary"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
              />
              Nossos Produtos
            </motion.p>
            <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-extrabold">
              Chopps <span className="text-primary">Ashby</span>
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5"
          >
            {products.map((p, i) => (
              <motion.div key={p.name} variants={scaleIn}
                className="group rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden hover:border-primary/30 transition-all duration-500"
                onMouseEnter={() => setHoveredProduct(i)}
                onMouseLeave={() => setHoveredProduct(null)}
                whileHover={{ y: -8, boxShadow: '0 25px 50px -12px hsl(var(--primary) / 0.15)' }}
                transition={{ type: "spring", stiffness: 200, damping: 20 }}
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                  <motion.img
                    src={p.image} alt={p.name}
                    className="w-full h-full object-cover"
                    animate={{ scale: hoveredProduct === i ? 1.1 : 1 }}
                    transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                  />
                  <AnimatePresence>
                    {hoveredProduct === i && (
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-t from-primary/20 via-transparent to-transparent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      />
                    )}
                  </AnimatePresence>
                  {p.tag && (
                    <motion.span
                      className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow-md"
                      initial={{ opacity: 0, scale: 0.8 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                    >
                      {p.tag}
                    </motion.span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-foreground group-hover:text-primary transition-colors duration-300">{p.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.4 }}
            className="mt-10 text-center"
          >
            <Link to="/produtos">
              <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" className="rounded-full px-6 hover:border-primary/40 hover:bg-primary/5 transition-all duration-300">
                  Ver catálogo completo <ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════
          CALCULADORA — accent glow bg
      ══════════════════════════════════════════════════ */}
      <div className="relative">
        <WaveDivider flip className="-mb-px" />
        <Section id="calculadora" className="py-24 sm:py-32 bg-gradient-to-b from-primary/[0.06] via-primary/[0.03] to-transparent">
          <FloatingOrb className="w-[400px] h-[400px] bg-primary/[0.07] blur-[100px] top-[10%] left-[50%] -translate-x-1/2" delay={0} duration={22} />

          <div className="max-w-3xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mb-10">
              <motion.p variants={fadeIn} className="text-primary font-semibold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
                <motion.span className="w-8 h-px bg-primary" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} />
                Ferramenta Gratuita
              </motion.p>
              <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-extrabold">
                Calculadora de <span className="text-primary">Chopp</span>
              </motion.h2>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-2xl border border-primary/10 bg-card/70 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-primary/5"
            >
              <div className="grid sm:grid-cols-2 gap-8">
                <div className="space-y-8">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-3 block">Convidados</Label>
                    <div className="flex items-center gap-4">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0 hover:border-primary/40 transition-colors" onClick={() => setNumPessoas(Math.max(10, numPessoas - 10))}>
                          <Minus className="w-4 h-4" />
                        </Button>
                      </motion.div>
                      <div className="flex-1 text-center">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={numPessoas}
                            initial={{ opacity: 0, y: -10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="text-4xl font-extrabold inline-block"
                          >
                            {numPessoas}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-muted-foreground ml-2 text-sm">pessoas</span>
                      </div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0 hover:border-primary/40 transition-colors" onClick={() => setNumPessoas(numPessoas + 10)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground mb-3 block">Duração</Label>
                    <div className="flex items-center gap-4">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0 hover:border-primary/40 transition-colors" onClick={() => setDuracao(Math.max(1, duracao - 1))}>
                          <Minus className="w-4 h-4" />
                        </Button>
                      </motion.div>
                      <div className="flex-1 text-center">
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={duracao}
                            initial={{ opacity: 0, y: -10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            transition={{ duration: 0.2 }}
                            className="text-4xl font-extrabold inline-block"
                          >
                            {duracao}
                          </motion.span>
                        </AnimatePresence>
                        <span className="text-muted-foreground ml-2 text-sm">horas</span>
                      </div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                        <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0 hover:border-primary/40 transition-colors" onClick={() => setDuracao(duracao + 1)}>
                          <Plus className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>

                <motion.div
                  className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 p-6"
                  whileHover={{ borderColor: 'hsl(var(--primary) / 0.3)', boxShadow: '0 0 40px hsl(var(--primary) / 0.08)' }}
                  transition={{ duration: 0.4 }}
                >
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Users className="w-8 h-8 text-primary mb-3" />
                  </motion.div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Recomendado</p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={totalLitros}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="text-5xl font-extrabold text-foreground"
                    >
                      {totalLitros}L
                    </motion.p>
                  </AnimatePresence>
                  <p className="text-muted-foreground mt-1 mb-5">
                    ≈ {barris30L} {barris30L === 1 ? 'barril' : 'barris'} de 30L
                  </p>
                  <MagneticWrap>
                    <Button
                      className="bg-primary text-primary-foreground font-semibold rounded-full px-6 shadow-md shadow-primary/20 hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300"
                      onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Solicitar orçamento
                    </Button>
                  </MagneticWrap>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </Section>
        <WaveDivider className="-mt-px" />
      </div>

      {/* ══════════════════════════════════════════════════
          SOBRE — clean with floating visual
      ══════════════════════════════════════════════════ */}
      <Section id="sobre" className="py-24 sm:py-32">
        <FloatingOrb className="w-[300px] h-[300px] bg-primary/[0.04] blur-[80px] top-[30%] right-[10%]" delay={4} duration={19} />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideFromLeft}
              className="space-y-5"
            >
              <p className="text-primary font-semibold text-sm tracking-widest uppercase flex items-center gap-2">
                <motion.span className="w-8 h-px bg-primary" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} />
                Sobre Nós
              </p>
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                A tradição do chopp <span className="text-primary">Ashby</span> em Taubaté
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Distribuidores oficiais da Cervejaria Ashby, a primeira microcervejaria do Brasil,
                fundada em 1993 em Amparo/SP. Levamos chopps artesanais premiados internacionalmente 
                para festas e eventos corporativos na região.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Com mais de 500 eventos atendidos, oferecemos atendimento personalizado 
                que garante o sucesso da sua festa — da escolha do chopp até a entrega pontual.
              </p>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideFromRight}
              className="relative flex items-center justify-center"
            >
              {/* Glowing ring behind logo */}
              <motion.div
                className="absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full border border-primary/10"
                animate={{ rotate: 360 }}
                transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
              />
              <motion.div
                className="absolute w-60 h-60 sm:w-68 sm:h-68 rounded-full border border-primary/5"
                animate={{ rotate: -360 }}
                transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              />
              
              <motion.div
                className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-gradient-to-br from-primary/10 via-card/80 to-card/50 backdrop-blur-sm border border-primary/10 flex items-center justify-center relative shadow-2xl shadow-primary/5"
                whileHover={{ borderColor: 'hsl(var(--primary) / 0.25)' }}
              >
                <motion.img
                  src={logoTaubateChopp} alt="Taubaté Chopp"
                  className="w-44 h-44 rounded-full object-cover shadow-xl ring-4 ring-primary/20"
                  whileHover={{ scale: 1.05, rotate: 3 }}
                  transition={{ type: "spring", stiffness: 200 }}
                />
                <motion.div
                  className="absolute -bottom-4 -right-4 bg-card border border-border/50 rounded-xl px-4 py-2.5 shadow-lg"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  whileInView={{ opacity: 1, y: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
                >
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-bold text-xs">Desde 1993</p>
                      <p className="text-[10px] text-muted-foreground">Tradição Ashby</p>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════
          DEPOIMENTOS — warm tinted bg
      ══════════════════════════════════════════════════ */}
      <div className="relative">
        <WaveDivider flip className="-mb-px" />
        <Section className="py-24 sm:py-32 bg-gradient-to-b from-primary/[0.05] via-muted/30 to-transparent">
          <FloatingOrb className="w-[300px] h-[300px] bg-primary/[0.06] blur-[90px] top-[20%] left-[5%]" delay={6} duration={21} />
          <FloatingOrb className="w-[200px] h-[200px] bg-primary/[0.04] blur-[60px] bottom-[15%] right-[15%]" delay={2} duration={17} />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mb-14">
              <motion.p variants={fadeIn} className="text-primary font-semibold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
                <motion.span className="w-8 h-px bg-primary" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} />
                Depoimentos
              </motion.p>
              <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-extrabold">
                O que nossos clientes dizem
              </motion.h2>
            </motion.div>

            <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}
              className="grid md:grid-cols-3 gap-6"
            >
              {testimonials.map((t, i) => (
                <motion.div key={i} variants={scaleIn}
                  className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6 hover:border-primary/25 hover:shadow-xl hover:shadow-primary/5 transition-all duration-500"
                  whileHover={{ y: -6 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                >
                  <div className="flex gap-0.5 mb-4">
                    {[...Array(5)].map((_, j) => (
                      <motion.div
                        key={j}
                        initial={{ opacity: 0, scale: 0, rotate: -30 }}
                        whileInView={{ opacity: 1, scale: 1, rotate: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.4 + j * 0.08, type: "spring", stiffness: 300 }}
                      >
                        <Star className="w-4 h-4 text-primary fill-primary" />
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-5 leading-relaxed italic">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <motion.div
                      className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center"
                      whileHover={{ scale: 1.1, backgroundColor: 'hsl(var(--primary) / 0.2)' }}
                    >
                      <span className="text-primary font-bold text-sm">{t.name.charAt(0)}</span>
                    </motion.div>
                    <div>
                      <p className="font-semibold text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.role}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </Section>
      </div>

      {/* ══════════════════════════════════════════════════
          FAQ
      ══════════════════════════════════════════════════ */}
      <Section id="faq" className="py-24 sm:py-32">
        <FloatingOrb className="w-[250px] h-[250px] bg-primary/[0.04] blur-[70px] top-[40%] -right-[50px]" delay={5} duration={20} />

        <div className="max-w-2xl mx-auto px-4 sm:px-6 relative z-10">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="mb-10">
            <motion.p variants={fadeIn} className="text-primary font-semibold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
              <motion.span className="w-8 h-px bg-primary" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} />
              FAQ
            </motion.p>
            <motion.h2 variants={fadeIn} className="text-3xl sm:text-4xl font-extrabold">
              Perguntas Frequentes
            </motion.h2>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, i) => (
                <motion.div key={i} variants={fadeUp} custom={i}>
                  <AccordionItem value={`item-${i}`}
                    className="border border-border/40 rounded-xl px-5 bg-card/60 backdrop-blur-sm data-[state=open]:border-primary/30 data-[state=open]:shadow-lg data-[state=open]:shadow-primary/5 data-[state=open]:bg-card/80 transition-all duration-300"
                  >
                    <AccordionTrigger className="text-left hover:no-underline py-4 text-sm font-medium hover:text-primary transition-colors duration-200">
                      {item.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                      {item.a}
                    </AccordionContent>
                  </AccordionItem>
                </motion.div>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════
          CONTATO — warm accent bg
      ══════════════════════════════════════════════════ */}
      <div className="relative">
        <WaveDivider flip className="-mb-px" />
        <Section id="contato" className="py-24 sm:py-32 bg-gradient-to-b from-primary/[0.05] via-muted/20 to-background">
          <FloatingOrb className="w-[350px] h-[350px] bg-primary/[0.06] blur-[90px] top-[15%] right-[10%]" delay={1} duration={23} />
          <FloatingOrb className="w-[250px] h-[250px] bg-primary/[0.04] blur-[70px] bottom-[20%] left-[10%]" delay={9} duration={18} />

          <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
            <div className="grid lg:grid-cols-2 gap-12">
              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideFromLeft}
                className="space-y-6"
              >
                <div>
                  <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
                    <motion.span className="w-8 h-px bg-primary" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.6 }} />
                    Contato
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-extrabold mb-3">
                    Solicite seu <span className="text-primary">orçamento</span>
                  </h2>
                  <p className="text-muted-foreground">Atendimento personalizado e rápido.</p>
                </div>

                <div className="space-y-4">
                  {[
                    { icon: Phone, label: 'Telefone / WhatsApp', value: PHONE_NUMBER },
                    { icon: Mail, label: 'E-mail', value: 'contato@taubatechopp.com.br' },
                    { icon: MapPin, label: 'Endereço', value: ADDRESS },
                  ].map((c, i) => (
                    <motion.div key={i}
                      className="flex items-start gap-3 group cursor-default"
                      whileHover={{ x: 6 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    >
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/20 group-hover:shadow-md group-hover:shadow-primary/10 transition-all duration-300">
                        <c.icon className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">{c.label}</p>
                        <p className="text-sm font-medium">{c.value}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group"
                  whileHover={{ x: 4 }}
                >
                  <Instagram className="w-4 h-4 group-hover:text-primary transition-colors" /> @taubatechopp
                </motion.a>
              </motion.div>

              <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideFromRight}>
                <motion.div
                  className="rounded-2xl border border-border/40 bg-card/70 backdrop-blur-md p-6 sm:p-8 shadow-xl shadow-primary/5"
                  whileHover={{ borderColor: 'hsl(var(--border))' }}
                >
                  <div className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="nome" className="text-xs">Nome *</Label>
                        <Input id="nome" placeholder="Seu nome" value={formData.nome}
                          onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                          className="h-11 rounded-lg bg-background/50 focus:ring-2 focus:ring-primary/20 transition-shadow" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="telefone" className="text-xs">Telefone *</Label>
                        <Input id="telefone" placeholder="(12) 99999-9999" value={formData.telefone}
                          onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                          className="h-11 rounded-lg bg-background/50 focus:ring-2 focus:ring-primary/20 transition-shadow" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-xs">E-mail</Label>
                      <Input id="email" type="email" placeholder="seu@email.com" value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="h-11 rounded-lg bg-background/50 focus:ring-2 focus:ring-primary/20 transition-shadow" />
                    </div>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="tipoEvento" className="text-xs">Tipo de Evento</Label>
                        <Input id="tipoEvento" placeholder="Ex: Casamento" value={formData.tipoEvento}
                          onChange={(e) => setFormData({ ...formData, tipoEvento: e.target.value })}
                          className="h-11 rounded-lg bg-background/50 focus:ring-2 focus:ring-primary/20 transition-shadow" />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="dataEvento" className="text-xs">Data do Evento</Label>
                        <Input id="dataEvento" type="date" value={formData.dataEvento}
                          onChange={(e) => setFormData({ ...formData, dataEvento: e.target.value })}
                          className="h-11 rounded-lg bg-background/50 focus:ring-2 focus:ring-primary/20 transition-shadow" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="mensagem" className="text-xs">Mensagem</Label>
                      <Textarea id="mensagem" placeholder="Conte sobre seu evento..." rows={3} value={formData.mensagem}
                        onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                        className="rounded-lg bg-background/50 resize-none focus:ring-2 focus:ring-primary/20 transition-shadow" />
                    </div>
                    <MagneticWrap>
                      <Button
                        className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-lg shadow-md shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.01] active:scale-[0.99] transition-all duration-300"
                        onClick={handleWhatsApp} disabled={isSubmitting}
                      >
                        {isSubmitting ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Enviando...</> :
                          <><Send className="mr-2 w-4 h-4" />Enviar via WhatsApp</>}
                      </Button>
                    </MagneticWrap>
                    <p className="text-[11px] text-muted-foreground text-center">Seus dados serão salvos para facilitar o atendimento</p>
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </div>
        </Section>
      </div>

      {/* ── Footer ── */}
      <footer className="relative py-10 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <motion.div
            className="flex items-center gap-3"
            whileHover={{ x: 4 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <img src={logoTaubateChopp} alt="Taubaté Chopp" className="h-8 w-8 rounded-full object-cover" />
            <div>
              <p className="font-semibold text-sm">Taubaté Chopp</p>
              <p className="text-xs text-muted-foreground">Distribuidor Oficial Ashby</p>
            </div>
          </motion.div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Taubaté Chopp. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ── WhatsApp Float ── */}
      <motion.a
        href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-colors"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 1.2 }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="w-6 h-6 text-white" />
        <motion.span
          className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-primary rounded-full"
          animate={{ scale: [1, 1.3, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.a>
    </div>
  );
}
