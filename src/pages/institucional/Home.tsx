import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
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
  Facebook
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import logoTaubateChopp from '@/assets/logo-taubate-chopp.jpeg';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
};

// Products data (based on Ashby)
const featuredProducts = [
  {
    id: 1,
    name: 'Pilsen Clássica',
    description: 'Leveza e refrescância com o sabor autêntico do chopp artesanal.',
    badge: 'Mais Vendido',
    image: '🍺'
  },
  {
    id: 2,
    name: 'Pale Ale',
    description: 'Eleita a melhor do mundo em 2017. Amargor equilibrado e notas frutadas.',
    badge: 'Premiada',
    image: '🏆'
  },
  {
    id: 3,
    name: 'IPA Nirvana',
    description: 'Notas cítricas intensas e amargor marcante para os apreciadores.',
    badge: 'Especial',
    image: '🌟'
  },
  {
    id: 4,
    name: 'Weiss',
    description: 'Suave e refrescante, com aroma de banana e cravo.',
    badge: null,
    image: '🌾'
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

export default function InstitucionalHome() {
  const [numPessoas, setNumPessoas] = useState(50);
  const [duracao, setDuracao] = useState(4);
  const [formData, setFormData] = useState({
    nome: '',
    telefone: '',
    email: '',
    tipoEvento: '',
    dataEvento: '',
    mensagem: ''
  });

  // Calculator logic
  const litrosPorPessoa = duracao <= 3 ? 0.8 : duracao <= 5 ? 1.0 : 1.5;
  const totalLitros = Math.ceil(numPessoas * litrosPorPessoa);
  const barris30L = Math.ceil(totalLitros / 30);

  const handleWhatsApp = () => {
    const message = encodeURIComponent(
      `Olá! Gostaria de fazer um orçamento:\n\n` +
      `Nome: ${formData.nome}\n` +
      `Tipo de Evento: ${formData.tipoEvento}\n` +
      `Data: ${formData.dataEvento}\n` +
      `Pessoas: ${numPessoas}\n` +
      `Estimativa: ${totalLitros}L (${barris30L} barris de 30L)\n\n` +
      `${formData.mensagem}`
    );
    window.open(`https://wa.me/5512999999999?text=${message}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3">
              <img 
                src={logoTaubateChopp} 
                alt="Taubaté Chopp" 
                className="h-10 w-10 rounded-full object-cover"
              />
              <span className="text-lg font-bold text-foreground tracking-tight hidden sm:block">
                Taubaté Chopp
              </span>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#produtos" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Produtos
              </a>
              <a href="#calculadora" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Calculadora
              </a>
              <a href="#sobre" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Sobre
              </a>
              <a href="#faq" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                FAQ
              </a>
              <a href="#contato" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contato
              </a>
            </div>

            <div className="flex items-center gap-3">
              <Link to="/produtos">
                <Button variant="outline" size="sm" className="hidden sm:flex">
                  Ver Catálogo
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="bg-primary hover:bg-primary/90">
                  Sistema
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-amber-500/10 via-transparent to-transparent" />
        
        {/* Floating elements */}
        <motion.div 
          className="absolute top-1/4 left-10 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity }}
        />
        <motion.div 
          className="absolute bottom-1/4 right-10 w-80 h-80 bg-primary/5 rounded-full blur-3xl"
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 10, repeat: Infinity }}
        />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-8"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="px-4 py-1.5 text-sm border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                <Award className="w-4 h-4 mr-2" />
                Distribuidor Oficial Ashby
              </Badge>
            </motion.div>

            <motion.h1 
              variants={fadeInUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight"
            >
              <span className="text-foreground">Chopp Premium</span>
              <br />
              <span className="bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 bg-clip-text text-transparent">
                para seu evento
              </span>
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
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button 
                size="lg" 
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8 py-6 text-lg rounded-full shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
                onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <PartyPopper className="mr-2 h-5 w-5" />
                Solicitar Orçamento
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                className="px-8 py-6 text-lg rounded-full border-border/60"
                onClick={() => document.getElementById('calculadora')?.scrollIntoView({ behavior: 'smooth' })}
              >
                <Calculator className="mr-2 h-5 w-5" />
                Calcular Quantidade
              </Button>
            </motion.div>

            {/* Trust indicators */}
            <motion.div 
              variants={fadeInUp}
              className="pt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 text-amber-500 fill-amber-500" />
                  ))}
                </div>
                <span className="text-sm">+500 eventos</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                <span className="text-sm">Entrega no mesmo dia</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5" />
                <span className="text-sm">Chopp premiado</span>
              </div>
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div 
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <ChevronRight className="w-6 h-6 text-muted-foreground rotate-90" />
        </motion.div>
      </section>

      {/* Differentials */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {differentials.map((diff, index) => (
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full bg-card/50 backdrop-blur border-border/40 hover:border-amber-500/30 transition-colors group">
                  <CardContent className="p-6 text-center">
                    <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                      <diff.icon className="w-7 h-7 text-amber-500" />
                    </div>
                    <h3 className="font-semibold text-foreground mb-2">{diff.title}</h3>
                    <p className="text-sm text-muted-foreground">{diff.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Products Section */}
      <section id="produtos" className="py-20 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-16"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4">Nossos Produtos</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Chopps <span className="text-amber-500">Ashby</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto">
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
              <motion.div key={product.id} variants={fadeInUp}>
                <Card className="h-full overflow-hidden group hover:shadow-xl hover:shadow-amber-500/10 transition-all duration-300 border-border/40 hover:border-amber-500/30">
                  <div className="relative h-48 bg-gradient-to-br from-amber-500/10 to-amber-600/5 flex items-center justify-center">
                    <span className="text-7xl group-hover:scale-110 transition-transform duration-300">
                      {product.image}
                    </span>
                    {product.badge && (
                      <Badge className="absolute top-4 right-4 bg-amber-500 text-black">
                        {product.badge}
                      </Badge>
                    )}
                  </div>
                  <CardContent className="p-5">
                    <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
                    <p className="text-sm text-muted-foreground">{product.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div 
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="text-center mt-10"
          >
            <Link to="/produtos">
              <Button variant="outline" size="lg" className="group">
                Ver catálogo completo
                <ChevronRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Calculator Section */}
      <section id="calculadora" className="py-20 bg-muted/30 scroll-mt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4">
                <Calculator className="w-4 h-4 mr-2" />
                Ferramenta Gratuita
              </Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Calculadora de <span className="text-amber-500">Chopp</span>
            </motion.h2>
            <motion.p variants={fadeInUp} className="text-muted-foreground">
              Descubra a quantidade ideal de chopp para seu evento
            </motion.p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Card className="overflow-hidden border-border/40 shadow-xl">
              <CardContent className="p-8">
                <div className="grid gap-8 md:grid-cols-2">
                  {/* Inputs */}
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm text-muted-foreground mb-3 block">
                        Número de convidados
                      </Label>
                      <div className="flex items-center gap-4">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setNumPessoas(Math.max(10, numPessoas - 10))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 text-center">
                          <span className="text-4xl font-bold text-foreground">{numPessoas}</span>
                          <span className="text-muted-foreground ml-2">pessoas</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setNumPessoas(numPessoas + 10)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm text-muted-foreground mb-3 block">
                        Duração do evento
                      </Label>
                      <div className="flex items-center gap-4">
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setDuracao(Math.max(1, duracao - 1))}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <div className="flex-1 text-center">
                          <span className="text-4xl font-bold text-foreground">{duracao}</span>
                          <span className="text-muted-foreground ml-2">horas</span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={() => setDuracao(duracao + 1)}
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Result */}
                  <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20">
                    <Users className="w-8 h-8 text-amber-500 mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">Quantidade recomendada</p>
                    <p className="text-5xl font-bold text-foreground mb-1">{totalLitros}L</p>
                    <p className="text-lg text-muted-foreground mb-4">
                      ≈ {barris30L} {barris30L === 1 ? 'barril' : 'barris'} de 30L
                    </p>
                    <Button 
                      className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                      onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                      Solicitar orçamento
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* About Section */}
      <section id="sobre" className="py-20 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <Badge variant="outline">Sobre Nós</Badge>
              <h2 className="text-3xl sm:text-4xl font-bold">
                A tradição do chopp <span className="text-amber-500">Ashby</span> em Taubaté
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                A Taubaté Chopp é distribuidora oficial da Cervejaria Ashby, 
                a primeira microcervejaria do Brasil, fundada em 1993 em Amparo/SP. 
                Nossa missão é levar a qualidade dos chopps artesanais premiados 
                internacionalmente para festas, eventos corporativos e celebrações na região.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Com mais de 500 eventos atendidos, oferecemos não apenas produtos de excelência, 
                mas um atendimento personalizado que garante o sucesso da sua festa. 
                Da escolha do chopp ideal até a entrega pontual, cuidamos de cada detalhe.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Distribuidor Oficial Ashby</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>+500 eventos realizados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span>Atendimento 7 dias</span>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="relative"
            >
              <div className="aspect-square rounded-3xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 flex items-center justify-center border border-amber-500/20">
                <img 
                  src={logoTaubateChopp} 
                  alt="Taubaté Chopp" 
                  className="w-48 h-48 rounded-full object-cover shadow-2xl"
                />
              </div>
              <div className="absolute -bottom-6 -left-6 bg-card border border-border rounded-2xl p-4 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Award className="w-6 h-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="font-semibold">Desde 1993</p>
                    <p className="text-sm text-muted-foreground">Tradição Ashby</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4">Depoimentos</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
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
              <motion.div key={index} variants={fadeInUp}>
                <Card className="h-full border-border/40">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 text-amber-500 fill-amber-500" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 italic">"{testimonial.text}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                        <span className="text-amber-500 font-semibold">
                          {testimonial.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{testimonial.name}</p>
                        <p className="text-xs text-muted-foreground">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="text-center mb-12"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4">Dúvidas Frequentes</Badge>
            </motion.div>
            <motion.h2 variants={fadeInUp} className="text-3xl sm:text-4xl font-bold mb-4">
              Perguntas <span className="text-amber-500">Frequentes</span>
            </motion.h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <Accordion type="single" collapsible className="space-y-3">
              {faqItems.map((item, index) => (
                <AccordionItem 
                  key={index} 
                  value={`item-${index}`}
                  className="border border-border/40 rounded-xl px-6 bg-card/50 data-[state=open]:bg-card"
                >
                  <AccordionTrigger className="text-left hover:no-underline py-5">
                    <span className="font-medium">{item.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground pb-5">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contato" className="py-20 bg-muted/30 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-8"
            >
              <div>
                <Badge variant="outline" className="mb-4">Contato</Badge>
                <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                  Solicite seu <span className="text-amber-500">orçamento</span>
                </h2>
                <p className="text-muted-foreground">
                  Entre em contato conosco para um atendimento personalizado. 
                  Responderemos o mais rápido possível!
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Phone className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Telefone / WhatsApp</p>
                    <p className="font-semibold">(12) 99999-9999</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">E-mail</p>
                    <p className="font-semibold">contato@taubatechopp.com.br</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Atendimento</p>
                    <p className="font-semibold">Taubaté e Região do Vale</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:border-amber-500/50 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full bg-card border border-border flex items-center justify-center hover:border-amber-500/50 transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </a>
              </div>
            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card className="border-border/40">
                <CardContent className="p-6 space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="nome">Nome</Label>
                      <Input 
                        id="nome" 
                        placeholder="Seu nome"
                        value={formData.nome}
                        onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="telefone">Telefone</Label>
                      <Input 
                        id="telefone" 
                        placeholder="(12) 99999-9999"
                        value={formData.telefone}
                        onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
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
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dataEvento">Data do Evento</Label>
                      <Input 
                        id="dataEvento" 
                        type="date"
                        value={formData.dataEvento}
                        onChange={(e) => setFormData({ ...formData, dataEvento: e.target.value })}
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
                    />
                  </div>
                  <Button 
                    className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    onClick={handleWhatsApp}
                  >
                    <Send className="mr-2 w-4 h-4" />
                    Enviar via WhatsApp
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img 
                src={logoTaubateChopp} 
                alt="Taubaté Chopp" 
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <p className="font-semibold">Taubaté Chopp</p>
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
        href="https://wa.me/5512999999999"
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-colors"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </motion.a>
    </div>
  );
}
