import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';
import { 
  Beer, 
  Award, 
  Truck, 
  Clock, 
  ChevronRight, 
  Star,
  MapPin,
  Phone,
  Mail,
  MessageCircle,
  Calculator,
  Users,
  PartyPopper,
  Minus,
  Plus,
  Send,
  Instagram,
  Sparkles,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import logoTaubateChopp from '@/assets/logo-taubate-chopp.jpeg';

// Contact info
const PHONE_NUMBER = '+55 12 3432-6712';
const WHATSAPP_NUMBER = '551234326712';
const INSTAGRAM_URL = 'https://www.instagram.com/taubatechopp/';
const ADDRESS = 'R. Dr. Emílio Winther, 1117 - Jardim das Nações, Taubaté - SP, 12030-000';

// Enhanced animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] } 
  }
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } 
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.12, delayChildren: 0.1 } 
  }
};

const floatAnimation = {
  y: [0, -20, 0],
  transition: { duration: 6, repeat: Infinity, ease: "easeInOut" }
};

// Products data (based on Ashby)
const featuredProducts = [
  {
    id: 1,
    name: 'Pilsen Clássica',
    description: 'Leveza e refrescância com o sabor autêntico do chopp artesanal.',
    badge: 'Mais Vendido',
    image: '🍺',
    gradient: 'from-amber-400/20 to-yellow-500/20'
  },
  {
    id: 2,
    name: 'Pale Ale',
    description: 'Eleita a melhor do mundo em 2017. Amargor equilibrado e notas frutadas.',
    badge: 'Premiada',
    image: '🏆',
    gradient: 'from-orange-400/20 to-amber-500/20'
  },
  {
    id: 3,
    name: 'IPA Nirvana',
    description: 'Notas cítricas intensas e amargor marcante para os apreciadores.',
    badge: 'Especial',
    image: '🌟',
    gradient: 'from-amber-500/20 to-orange-600/20'
  },
  {
    id: 4,
    name: 'Weiss',
    description: 'Suave e refrescante, com aroma de banana e cravo.',
    badge: null,
    image: '🌾',
    gradient: 'from-yellow-300/20 to-amber-400/20'
  }
];

// Testimonials
const testimonials = [
  {
    name: 'Ricardo Mendes',
    role: 'Evento Corporativo',
    text: 'Contratamos para o aniversário da empresa. Chopp gelado, atendimento impecável e entrega pontual. Superou expectativas!',
    rating: 5
  },
  {
    name: 'Fernanda Lima',
    role: 'Casamento',
    text: 'O chopp Ashby foi um sucesso no nosso casamento! Todos os convidados elogiaram. A equipe da Taubaté Chopp é muito profissional.',
    rating: 5
  },
  {
    name: 'João Paulo Silva',
    role: 'Churrasco em Família',
    text: 'Qualidade excepcional! Entrega rápida e o chopp estava perfeito. Virou tradição nos nossos churrascos.',
    rating: 5
  }
];

// FAQ data
const faqItems = [
  {
    question: 'Qual a quantidade ideal de chopp por pessoa?',
    answer: 'Recomendamos calcular aproximadamente 1 litro de chopp por pessoa para eventos de 4 horas. Para eventos mais longos ou com público que aprecia cerveja, considere 1,5 litros por pessoa. Use nossa calculadora acima para uma estimativa precisa!'
  },
  {
    question: 'Vocês alugam chopeiras?',
    answer: 'Sim! Oferecemos aluguel de chopeiras elétricas portáteis para seu evento. A chopeira mantém o chopp na temperatura ideal durante toda a festa. O valor do aluguel varia conforme o modelo e período.'
  },
  {
    question: 'Qual o prazo de entrega?',
    answer: 'Entregas em Taubaté e região podem ser feitas no mesmo dia para pedidos até 14h. Para outras cidades, consulte nosso time para verificar disponibilidade e prazo.'
  },
  {
    question: 'Como funciona a devolução de barris?',
    answer: 'Trabalhamos com sistema de consignado. Você paga pelo chopp e deixa uma garantia pelos barris. Ao devolver os barris vazios (ou cheios, se não utilizar), fazemos o estorno do valor correspondente.'
  },
  {
    question: 'Quais formas de pagamento vocês aceitam?',
    answer: 'Aceitamos Pix, cartão de crédito (até 3x sem juros), cartão de débito e dinheiro. Para eventos corporativos, oferecemos faturamento mediante análise.'
  },
  {
    question: 'O chopp é realmente Ashby?',
    answer: 'Sim! Somos distribuidores oficiais da Cervejaria Ashby, a primeira microcervejaria do Brasil, fundada em 1993. Trabalhamos exclusivamente com produtos originais Ashby, garantindo a qualidade premiada internacionalmente.'
  }
];

// Differentials
const differentials = [
  {
    icon: Award,
    title: 'Qualidade Premiada',
    description: 'Chopp Ashby, a primeira microcervejaria do Brasil com prêmios internacionais.'
  },
  {
    icon: Truck,
    title: 'Entrega Rápida',
    description: 'Entregamos em Taubaté e região com agilidade e pontualidade.'
  },
  {
    icon: Clock,
    title: 'Atendimento 7 dias',
    description: 'Suporte completo de segunda a domingo para seu evento.'
  },
  {
    icon: Beer,
    title: 'Variedade de Chopps',
    description: 'Pilsen, Pale Ale, IPA, Weiss e mais opções para todos os gostos.'
  }
];

// Glassmorphism button component
const GlassButton = ({ children, className = '', ...props }: React.ComponentProps<typeof Button>) => (
  <Button
    className={`
      relative overflow-hidden
      bg-white/10 backdrop-blur-xl 
      border border-white/20 
      shadow-[0_8px_32px_rgba(0,0,0,0.12)]
      hover:bg-white/20 hover:border-white/30
      hover:shadow-[0_8px_32px_rgba(251,191,36,0.2)]
      transition-all duration-500 ease-out
      before:absolute before:inset-0 
      before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent
      before:translate-x-[-200%] hover:before:translate-x-[200%]
      before:transition-transform before:duration-700
      ${className}
    `}
    {...props}
  >
    {children}
  </Button>
);

// Glassmorphism card component
const GlassCard = ({ children, className = '', ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`
      relative overflow-hidden rounded-2xl
      bg-white/5 backdrop-blur-xl 
      border border-white/10 
      shadow-[0_8px_32px_rgba(0,0,0,0.12)]
      hover:bg-white/10 hover:border-white/20
      hover:shadow-[0_16px_48px_rgba(251,191,36,0.15)]
      transition-all duration-500 ease-out
      ${className}
    `}
    {...props}
  >
    {children}
  </div>
);

export default function InstitucionalHome() {
  const { toast } = useToast();
  const [numPessoas, setNumPessoas] = useState(50);
  const [duracao, setDuracao] = useState(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    tipoEvento: '',
    dataEvento: '',
    mensagem: ''
  });

  const { scrollYProgress } = useScroll();
  const heroOpacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  // Calculator logic
  const litrosPorPessoa = duracao <= 3 ? 0.8 : duracao <= 5 ? 1.0 : 1.5;
  const totalLitros = Math.ceil(numPessoas * litrosPorPessoa);
  const barris30L = Math.ceil(totalLitros / 30);

  const handleWhatsApp = async () => {
    if (!formData.nome || !formData.telefone) {
      toast({
        variant: 'destructive',
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha pelo menos nome e telefone.',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // First, create or find the client
      const { data: existingClient } = await supabase
        .from('clientes')
        .select('id')
        .eq('telefone', formData.telefone)
        .maybeSingle();

      let clienteId = existingClient?.id;

      if (!clienteId) {
        // Create new client
        const { data: newClient, error: clientError } = await supabase
          .from('clientes')
          .insert({
            nome: formData.nome,
            telefone: formData.telefone,
            email: formData.email || `${formData.telefone}@site.taubatechopp.com.br`,
            origem: 'Site',
            status: 'lead',
            observacoes: `Tipo de Evento: ${formData.tipoEvento || 'Não informado'}\nData: ${formData.dataEvento || 'Não informada'}\nMensagem: ${formData.mensagem || 'Sem mensagem'}`
          })
          .select('id')
          .single();

        if (clientError) throw clientError;
        clienteId = newClient.id;
      }

      // Create the lead linked to the client
      const { error: leadError } = await supabase
        .from('leads')
        .insert({
          cliente_id: clienteId,
          nome: formData.nome,
          telefone: formData.telefone,
          email: formData.email || null,
          origem: 'Site',
          status: 'novo_lead',
          valor_estimado: totalLitros * 15, // Estimativa baseada em R$15/litro
          observacoes: `Tipo de Evento: ${formData.tipoEvento || 'Não informado'}\nData do Evento: ${formData.dataEvento || 'Não informada'}\nEstimativa: ${totalLitros}L (${barris30L} barris)\nMensagem: ${formData.mensagem || 'Sem mensagem adicional'}`
        });

      if (leadError) throw leadError;

      toast({
        title: 'Lead registrado!',
        description: 'Seus dados foram salvos. Redirecionando para WhatsApp...',
      });

      // Open WhatsApp
      const message = encodeURIComponent(
        `Olá! Vim pelo site e gostaria de fazer um orçamento:\n\n` +
        `*Nome:* ${formData.nome}\n` +
        `*Telefone:* ${formData.telefone}\n` +
        (formData.email ? `*E-mail:* ${formData.email}\n` : '') +
        (formData.tipoEvento ? `*Tipo de Evento:* ${formData.tipoEvento}\n` : '') +
        (formData.dataEvento ? `*Data:* ${formData.dataEvento}\n` : '') +
        `*Estimativa:* ${totalLitros}L (${barris30L} barris de 30L)\n\n` +
        (formData.mensagem ? `*Mensagem:* ${formData.mensagem}` : '')
      );
      
      setTimeout(() => {
        window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
      }, 1000);

      // Clear form
      setFormData({
        nome: '',
        telefone: '',
        email: '',
        tipoEvento: '',
        dataEvento: '',
        mensagem: ''
      });

    } catch (error) {
      console.error('Error saving lead:', error);
      // Still open WhatsApp even if save fails
      const message = encodeURIComponent(
        `Olá! Gostaria de fazer um orçamento:\n\n` +
        `Nome: ${formData.nome}\n` +
        `Telefone: ${formData.telefone}\n` +
        `Estimativa: ${totalLitros}L (${barris30L} barris de 30L)`
      );
      window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Animated background elements */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <motion.div 
          className="absolute top-0 left-0 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-[120px]"
          animate={{ x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-primary/5 rounded-full blur-[150px]"
          animate={{ x: [0, -80, 0], y: [0, -60, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        />
        <motion.div 
          className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-amber-400/3 rounded-full blur-[100px]"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* Navbar with glassmorphism */}
      <motion.nav 
        className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-2xl border-b border-white/5"
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 group">
              <motion.img 
                src={logoTaubateChopp} 
                alt="Taubaté Chopp" 
                className="h-10 w-10 rounded-full object-cover ring-2 ring-amber-500/20 group-hover:ring-amber-500/50 transition-all duration-300"
                whileHover={{ scale: 1.1, rotate: 5 }}
              />
              <span className="text-lg font-bold text-foreground tracking-tight hidden sm:block">
                Taubaté Chopp
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-1 bg-white/5 backdrop-blur-xl rounded-full px-2 py-1 border border-white/10">
              {['Produtos', 'Calculadora', 'Sobre', 'FAQ', 'Contato'].map((item) => (
                <a 
                  key={item}
                  href={`#${item.toLowerCase()}`} 
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-white/10 rounded-full transition-all duration-300"
                >
                  {item}
                </a>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <Link to="/produtos">
                <GlassButton variant="ghost" size="sm" className="hidden sm:flex rounded-full">
                  <Sparkles className="w-4 h-4 mr-2 text-amber-500" />
                  Ver Catálogo
                </GlassButton>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-full shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300">
                  Sistema
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section with parallax */}
      <motion.section 
        className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16"
        style={{ opacity: heroOpacity, scale: heroScale }}
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-amber-950/20" />
          <motion.div 
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/20 via-transparent to-transparent"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </div>
        
        {/* Floating decorative elements */}
        <motion.div 
          className="absolute top-1/4 left-[10%] w-3 h-3 bg-amber-500 rounded-full"
          animate={floatAnimation}
        />
        <motion.div 
          className="absolute top-1/3 right-[15%] w-2 h-2 bg-amber-400 rounded-full"
          animate={{ ...floatAnimation, transition: { ...floatAnimation.transition, delay: 1 } }}
        />
        <motion.div 
          className="absolute bottom-1/3 left-[20%] w-4 h-4 bg-amber-600/50 rounded-full blur-sm"
          animate={{ ...floatAnimation, transition: { ...floatAnimation.transition, delay: 2 } }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-8"
          >
            <motion.div variants={fadeInScale}>
              <Badge 
                variant="outline" 
                className="px-5 py-2 text-sm border-amber-500/30 text-amber-500 bg-amber-500/10 backdrop-blur-xl shadow-lg shadow-amber-500/10"
              >
                <motion.span
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Award className="w-4 h-4 mr-2 inline" />
                </motion.span>
                Distribuidor Oficial Ashby
              </Badge>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight"
            >
              <span className="text-foreground">Chopp Premium</span>
              <br />
              <motion.span 
                className="bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 bg-clip-text text-transparent"
                animate={{ backgroundPosition: ['0%', '100%', '0%'] }}
                transition={{ duration: 5, repeat: Infinity }}
                style={{ backgroundSize: '200%' }}
              >
                para seu evento
              </motion.span>
            </motion.h1>

            <motion.p 
              variants={fadeInUp}
              className="max-w-2xl mx-auto text-lg sm:text-xl text-muted-foreground"
            >
              A qualidade da primeira microcervejaria do Brasil na sua festa. 
              Chopp Ashby gelado, entrega rápida e atendimento impecável em Taubaté e região.
            </motion.p>

            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-amber-500 via-amber-500 to-yellow-500 hover:from-amber-600 hover:via-amber-600 hover:to-yellow-600 text-black font-bold px-10 py-7 text-lg rounded-full shadow-2xl shadow-amber-500/30 hover:shadow-amber-500/50 transition-all duration-500"
                  onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <PartyPopper className="mr-2 h-5 w-5" />
                  Solicitar Orçamento
                </Button>
              </motion.div>
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <GlassButton 
                  size="lg" 
                  variant="outline"
                  className="px-10 py-7 text-lg rounded-full"
                  onClick={() => document.getElementById('calculadora')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  <Calculator className="mr-2 h-5 w-5 text-amber-500" />
                  Calcular Quantidade
                </GlassButton>
              </motion.div>
            </motion.div>

            {/* Trust indicators */}
            <motion.div 
              variants={fadeInUp}
              className="pt-16 flex flex-wrap items-center justify-center gap-8"
            >
              {[
                { icon: <div className="flex -space-x-1">{[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />)}</div>, text: '+500 eventos' },
                { icon: <Truck className="w-5 h-5 text-amber-500" />, text: 'Entrega no mesmo dia' },
                { icon: <Award className="w-5 h-5 text-amber-500" />, text: 'Chopp premiado' }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 backdrop-blur-xl border border-white/10"
                  whileHover={{ scale: 1.05, backgroundColor: 'rgba(255,255,255,0.1)' }}
                >
                  {item.icon}
                  <span className="text-sm text-muted-foreground">{item.text}</span>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 15, 0], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="w-6 h-10 rounded-full border-2 border-white/20 flex items-start justify-center p-2">
            <motion.div 
              className="w-1.5 h-1.5 bg-amber-500 rounded-full"
              animate={{ y: [0, 16, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
        </motion.div>
      </motion.section>

      {/* Differentials */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {differentials.map((diff, index) => (
              <motion.div key={index} variants={fadeInScale}>
                <GlassCard className="h-full p-6 text-center group cursor-pointer">
                  <motion.div 
                    className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <diff.icon className="w-8 h-8 text-amber-500" />
                  </motion.div>
                  <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-amber-500 transition-colors">
                    {diff.title}
                  </h3>
                  <p className="text-sm text-muted-foreground">{diff.description}</p>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Products Section */}
      <section id="produtos" className="py-24 relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4 border-amber-500/30 bg-amber-500/10">Nossos Produtos</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold mb-4">
              Chopps <span className="text-amber-500">Ashby</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto text-lg">
              A primeira microcervejaria do Brasil, fundada em 1993. 
              Tradição e qualidade premiada internacionalmente.
            </motion.p>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {featuredProducts.map((product) => (
              <motion.div key={product.id} variants={fadeInScale}>
                <GlassCard className="h-full overflow-hidden group">
                  <div className={`relative h-48 bg-gradient-to-br ${product.gradient} flex items-center justify-center overflow-hidden`}>
                    <motion.span 
                      className="text-8xl"
                      whileHover={{ scale: 1.2, rotate: 10 }}
                      transition={{ type: "spring", stiffness: 300 }}
                    >
                      {product.image}
                    </motion.span>
                    {product.badge && (
                      <Badge className="absolute top-4 right-4 bg-gradient-to-r from-amber-500 to-amber-600 text-black border-0 shadow-lg">
                        {product.badge}
                      </Badge>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-lg mb-2 group-hover:text-amber-500 transition-colors">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mt-12"
          >
            <Link to="/produtos">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                <GlassButton size="lg" className="rounded-full px-8">
                  Ver catálogo completo
                  <ChevronRight className="ml-2 w-5 h-5" />
                </GlassButton>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculadora" className="py-24 relative scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4 border-amber-500/30 bg-amber-500/10">
                <Calculator className="w-4 h-4 mr-2" />
                Ferramenta Gratuita
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold mb-4">
              Calculadora de <span className="text-amber-500">Chopp</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground text-lg">
              Descubra a quantidade ideal de chopp para seu evento
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
          >
            <GlassCard className="p-8">
              <div className="grid gap-10 md:grid-cols-2">
                {/* Inputs */}
                <div className="space-y-8">
                  <div>
                    <Label className="text-sm text-muted-foreground mb-4 block">
                      Número de convidados
                    </Label>
                    <div className="flex items-center gap-4">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                          onClick={() => setNumPessoas(Math.max(10, numPessoas - 10))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </motion.div>
                      <div className="flex-1 text-center">
                        <motion.span 
                          key={numPessoas}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-5xl font-bold text-foreground"
                        >
                          {numPessoas}
                        </motion.span>
                        <span className="text-muted-foreground ml-2">pessoas</span>
                      </div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                          onClick={() => setNumPessoas(numPessoas + 10)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-muted-foreground mb-4 block">
                      Duração do evento
                    </Label>
                    <div className="flex items-center gap-4">
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                          onClick={() => setDuracao(Math.max(1, duracao - 1))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                      </motion.div>
                      <div className="flex-1 text-center">
                        <motion.span 
                          key={duracao}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-5xl font-bold text-foreground"
                        >
                          {duracao}
                        </motion.span>
                        <span className="text-muted-foreground ml-2">horas</span>
                      </div>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button 
                          variant="outline" 
                          size="icon"
                          className="rounded-full border-white/20 bg-white/5 hover:bg-white/10"
                          onClick={() => setDuracao(duracao + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </motion.div>
                    </div>
                  </div>
                </div>

                {/* Result */}
                <motion.div 
                  className="flex flex-col items-center justify-center p-8 rounded-2xl bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20"
                  whileHover={{ scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Users className="w-10 h-10 text-amber-500 mb-4" />
                  </motion.div>
                  <p className="text-sm text-muted-foreground mb-2">Quantidade recomendada</p>
                  <motion.p 
                    key={totalLitros}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-6xl font-bold text-foreground mb-1"
                  >
                    {totalLitros}L
                  </motion.p>
                  <p className="text-lg text-muted-foreground mb-6">
                    ≈ {barris30L} {barris30L === 1 ? 'barril' : 'barris'} de 30L
                  </p>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-full shadow-lg shadow-amber-500/25"
                      onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Solicitar orçamento
                    </Button>
                  </motion.div>
                </motion.div>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="py-24 relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10">Sobre Nós</Badge>
              <h2 className="text-4xl sm:text-5xl font-bold">
                A tradição do chopp <span className="text-amber-500">Ashby</span> em Taubaté
              </h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                A Taubaté Chopp é distribuidora oficial da Cervejaria Ashby, 
                a primeira microcervejaria do Brasil, fundada em 1993 em Amparo/SP. 
                Nossa missão é levar a qualidade dos chopps artesanais premiados 
                internacionalmente para festas, eventos corporativos e celebrações na região.
              </p>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Com mais de 500 eventos atendidos, oferecemos não apenas produtos de excelência, 
                mas um atendimento personalizado que garante o sucesso da sua festa. 
                Da escolha do chopp ideal até a entrega pontual, cuidamos de cada detalhe.
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                {['Distribuidor Oficial Ashby', '+500 eventos realizados', 'Atendimento 7 dias'].map((item, i) => (
                  <motion.div 
                    key={i}
                    className="flex items-center gap-2 text-sm px-4 py-2 rounded-full bg-white/5 border border-white/10"
                    whileHover={{ scale: 1.05, backgroundColor: 'rgba(251,191,36,0.1)' }}
                  >
                    <div className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>{item}</span>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="relative"
            >
              <motion.div 
                className="aspect-square rounded-3xl bg-gradient-to-br from-amber-500/20 via-amber-500/10 to-transparent flex items-center justify-center border border-amber-500/20 overflow-hidden"
                whileHover={{ scale: 1.02 }}
              >
                <motion.img 
                  src={logoTaubateChopp} 
                  alt="Taubaté Chopp" 
                  className="w-56 h-56 rounded-full object-cover shadow-2xl shadow-amber-500/20 ring-4 ring-amber-500/20"
                  animate={{ y: [0, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
              </motion.div>
              <motion.div 
                className="absolute -bottom-6 -left-6 bg-background/80 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-2xl"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20">
                    <Award className="w-7 h-7 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-bold text-lg">Desde 1993</p>
                    <p className="text-sm text-muted-foreground">Tradição Ashby</p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4 border-amber-500/30 bg-amber-500/10">Depoimentos</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold mb-4">
              O que nossos clientes <span className="text-amber-500">dizem</span>
            </motion.h2>
          </motion.div>

          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid md:grid-cols-3 gap-6"
          >
            {testimonials.map((testimonial, index) => (
              <motion.div key={index} variants={fadeInScale}>
                <GlassCard className="h-full p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.1 }}
                      >
                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                      </motion.div>
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 italic leading-relaxed">"{testimonial.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-600/20 flex items-center justify-center border border-amber-500/20">
                      <span className="text-amber-500 font-bold text-lg">
                        {testimonial.name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{testimonial.name}</p>
                      <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                    </div>
                  </div>
                </GlassCard>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 relative scroll-mt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4 border-amber-500/30 bg-amber-500/10">Dúvidas Frequentes</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-4xl sm:text-5xl font-bold mb-4">
              Perguntas <span className="text-amber-500">Frequentes</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-4">
              {faqItems.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border border-white/10 rounded-2xl px-6 bg-white/5 backdrop-blur-xl data-[state=open]:bg-white/10 data-[state=open]:border-amber-500/30 transition-all duration-300"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-5 hover:text-amber-500 transition-colors">
                    <span className="font-medium text-base">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5 leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="py-24 relative scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div>
                <Badge variant="outline" className="mb-4 border-amber-500/30 bg-amber-500/10">Contato</Badge>
                <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                  Solicite seu <span className="text-amber-500">orçamento</span>
                </h2>
                <p className="text-muted-foreground text-lg">
                  Entre em contato conosco para um atendimento personalizado. 
                  Responderemos o mais rápido possível!
                </p>
              </div>

              <div className="space-y-5">
                {[
                  { icon: Phone, label: 'Telefone / WhatsApp', value: PHONE_NUMBER },
                  { icon: Mail, label: 'E-mail', value: 'contato@taubatechopp.com.br' },
                  { icon: MapPin, label: 'Endereço', value: ADDRESS }
                ].map((item, i) => (
                  <motion.div 
                    key={i}
                    className="flex items-start gap-4"
                    whileHover={{ x: 10 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20 flex-shrink-0">
                      <item.icon className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="font-semibold">{item.value}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="flex gap-3 pt-4">
                <motion.a 
                  href={INSTAGRAM_URL}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-12 h-12 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-gradient-to-br hover:from-purple-500/20 hover:to-pink-500/20 hover:border-pink-500/30 transition-all duration-300"
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Instagram className="w-5 h-5" />
                </motion.a>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <GlassCard className="p-8">
                <div className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome *</Label>
                      <Input 
                        id="nome" 
                        placeholder="Seu nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                        className="bg-white/5 border-white/10 focus:border-amber-500/50 rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone *</Label>
                      <Input 
                        id="telefone" 
                        placeholder="(12) 99999-9999"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                        className="bg-white/5 border-white/10 focus:border-amber-500/50 rounded-xl h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="seu@email.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="bg-white/5 border-white/10 focus:border-amber-500/50 rounded-xl h-12"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="tipoEvento">Tipo de Evento</Label>
                      <Input 
                        id="tipoEvento" 
                        placeholder="Ex: Casamento, Aniversário"
                        value={formData.tipoEvento}
                        onChange={(e) => setFormData({ ...formData, tipoEvento: e.target.value })}
                        className="bg-white/5 border-white/10 focus:border-amber-500/50 rounded-xl h-12"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataEvento">Data do Evento</Label>
                      <Input 
                        id="dataEvento" 
                        type="date"
                        value={formData.dataEvento}
                        onChange={(e) => setFormData({ ...formData, dataEvento: e.target.value })}
                        className="bg-white/5 border-white/10 focus:border-amber-500/50 rounded-xl h-12"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mensagem">Mensagem</Label>
                    <Textarea 
                      id="mensagem" 
                      placeholder="Conte-nos mais sobre seu evento..."
                      rows={4}
                      value={formData.mensagem}
                      onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                      className="bg-white/5 border-white/10 focus:border-amber-500/50 rounded-xl resize-none"
                    />
                  </div>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-amber-500 via-amber-500 to-yellow-500 hover:from-amber-600 hover:via-amber-600 hover:to-yellow-600 text-black font-bold rounded-xl shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all duration-300"
                      onClick={handleWhatsApp}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 w-5 h-5 animate-spin" />
                          Enviando...
                        </>
                      ) : (
                        <>
                          <Send className="mr-2 w-5 h-5" />
                          Enviar via WhatsApp
                        </>
                      )}
                    </Button>
                  </motion.div>
                  <p className="text-xs text-muted-foreground text-center">
                    Seus dados serão salvos para facilitar o atendimento
                  </p>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <motion.img 
                src={logoTaubateChopp} 
                alt="Taubaté Chopp" 
                className="h-12 w-12 rounded-full object-cover ring-2 ring-amber-500/20"
                whileHover={{ scale: 1.1, rotate: 5 }}
              />
              <div>
                <p className="font-bold">Taubaté Chopp</p>
                <p className="text-sm text-muted-foreground">Distribuidor Oficial Ashby</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Taubaté Chopp. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <motion.a
        href={`https://wa.me/${WHATSAPP_NUMBER}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 rounded-full shadow-2xl shadow-green-500/40 flex items-center justify-center transition-all duration-300"
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, delay: 1 }}
        whileHover={{ scale: 1.15 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="w-7 h-7 text-white" />
        <motion.div 
          className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full"
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.a>
    </div>
  );
}
