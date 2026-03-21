import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Beer, Award, Truck, Clock, ChevronRight, Star, MapPin, Phone, Mail,
  MessageCircle, Calculator, Users, Minus, Plus, Send, Instagram,
  Loader2, ShoppingCart, Sparkles
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

  const litrosPorPessoa = duracao <= 3 ? 0.8 : duracao <= 5 ? 1.0 : 1.5;
  const totalLitros = Math.ceil(numPessoas * litrosPorPessoa);
  const barris30L = Math.ceil(totalLitros / 30);

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

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logoTaubateChopp} alt="Taubaté Chopp"
              className="h-8 w-8 rounded-full object-cover ring-1 ring-primary/20"
            />
            <span className="font-semibold text-sm tracking-tight hidden sm:block text-foreground/90">Taubaté Chopp</span>
          </Link>
          <div className="hidden md:flex items-center">
            {['produtos', 'calculadora', 'sobre', 'faq', 'contato'].map((s) => (
              <a key={s} href={`#${s}`}
                className="px-4 py-2 text-xs font-medium text-muted-foreground/70 hover:text-foreground tracking-wide uppercase transition-colors duration-200"
              >
                {s}
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
              <Button size="sm" className="bg-foreground text-background font-medium rounded-full px-5 text-xs hover:bg-foreground/90 h-8">
                Sistema
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative min-h-screen flex items-center justify-center pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/[0.08]" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 text-center">
          {/* Badge */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-primary text-xs font-medium tracking-wider">
              <Sparkles className="w-3 h-3" />
              DISTRIBUIDOR OFICIAL ASHBY
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.05] tracking-tight text-foreground mb-6">
            Chopp premium para<br />seu evento
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground/70 max-w-lg mx-auto mb-12 leading-relaxed font-light">
            A qualidade da primeira microcervejaria do Brasil —
            direto para a sua festa.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              size="lg"
              className="bg-foreground text-background font-semibold px-8 h-12 rounded-full hover:bg-foreground/90 text-sm"
              onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Solicitar Orçamento
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 h-12 border-border/50 text-sm font-medium"
              onClick={() => document.getElementById('calculadora')?.scrollIntoView({ behavior: 'smooth' })}
            >
              <Calculator className="mr-2 w-4 h-4" />
              Calcular Quantidade
            </Button>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12 mt-20 pt-8 border-t border-border/20">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl sm:text-3xl font-bold text-foreground/90 tabular-nums">{s.value}</p>
                <p className="text-xs text-muted-foreground/50 mt-1 tracking-wide">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Diferenciais ── */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-primary/[0.04] via-primary/[0.02] to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: Award, title: 'Qualidade Premiada', desc: 'Primeira microcervejaria do Brasil com prêmios internacionais.' },
              { icon: Truck, title: 'Entrega Rápida', desc: 'Taubaté e região com agilidade e pontualidade.' },
              { icon: Clock, title: 'Atendimento 7 dias', desc: 'Suporte completo, segunda a domingo.' },
              { icon: Beer, title: 'Variedade', desc: 'Pilsen, Pale Ale, IPA, Weiss e mais.' },
            ].map((d, i) => (
              <div key={i}
                className="rounded-2xl p-6 bg-card/50 border border-border/30 hover:border-primary/30 hover:bg-card/80 transition-colors duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <d.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-bold text-foreground mb-1">{d.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Produtos ── */}
      <section id="produtos" className="py-24 sm:py-32 bg-gradient-to-b from-background via-muted/40 to-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-14">
            <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
              <span className="w-8 h-px bg-primary" />
              Nossos Produtos
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              Chopps <span className="text-primary">Ashby</span>
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((p, i) => (
              <div key={p.name}
                className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden hover:border-primary/30 transition-colors duration-300"
              >
                <div className="aspect-[4/3] overflow-hidden bg-muted relative">
                  <img
                    src={p.image} alt={p.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                  />
                  {p.tag && (
                    <span className="absolute top-3 right-3 text-[10px] font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full bg-primary text-primary-foreground shadow-md">
                      {p.tag}
                    </span>
                  )}
                </div>
                <div className="p-5">
                  <h3 className="font-bold text-foreground">{p.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Link to="/produtos">
              <Button variant="outline" className="rounded-full px-6 hover:border-primary/40 hover:bg-primary/5 transition-colors duration-300">
                Ver catálogo completo <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Calculadora ── */}
      <section id="calculadora" className="py-24 sm:py-32 bg-gradient-to-b from-primary/[0.06] via-primary/[0.03] to-transparent">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
              <span className="w-8 h-px bg-primary" />
              Ferramenta Gratuita
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              Calculadora de <span className="text-primary">Chopp</span>
            </h2>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-card/70 p-6 sm:p-8 shadow-xl shadow-primary/5">
            <div className="grid sm:grid-cols-2 gap-8">
              <div className="space-y-8">
                <div>
                  <Label className="text-sm text-muted-foreground mb-3 block">Convidados</Label>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={() => setNumPessoas(Math.max(10, numPessoas - 10))}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 text-center">
                      <span className="text-4xl font-extrabold">{numPessoas}</span>
                      <span className="text-muted-foreground ml-2 text-sm">pessoas</span>
                    </div>
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={() => setNumPessoas(numPessoas + 10)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground mb-3 block">Duração</Label>
                  <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={() => setDuracao(Math.max(1, duracao - 1))}>
                      <Minus className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 text-center">
                      <span className="text-4xl font-extrabold">{duracao}</span>
                      <span className="text-muted-foreground ml-2 text-sm">horas</span>
                    </div>
                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 shrink-0" onClick={() => setDuracao(duracao + 1)}>
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/15 p-6">
                <Users className="w-8 h-8 text-primary mb-3" />
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Recomendado</p>
                <p className="text-5xl font-extrabold text-foreground">{totalLitros}L</p>
                <p className="text-muted-foreground mt-1 mb-5">
                  ≈ {barris30L} {barris30L === 1 ? 'barril' : 'barris'} de 30L
                </p>
                <Button
                  className="bg-primary text-primary-foreground font-semibold rounded-full px-6 shadow-md shadow-primary/20"
                  onClick={() => document.getElementById('contato')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Solicitar orçamento
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Sobre ── */}
      <section id="sobre" className="py-24 sm:py-32">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-5">
              <p className="text-primary font-semibold text-sm tracking-widest uppercase flex items-center gap-2">
                <span className="w-8 h-px bg-primary" />
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
            </div>

            <div className="relative flex items-center justify-center">
              <div className="w-64 h-64 sm:w-72 sm:h-72 rounded-3xl bg-gradient-to-br from-primary/10 via-card/80 to-card/50 border border-primary/10 flex items-center justify-center relative shadow-2xl shadow-primary/5">
                <img
                  src={logoTaubateChopp} alt="Taubaté Chopp"
                  className="w-44 h-44 rounded-full object-cover shadow-xl ring-4 ring-primary/20"
                />
                <div className="absolute -bottom-4 -right-4 bg-card border border-border/50 rounded-xl px-4 py-2.5 shadow-lg">
                  <div className="flex items-center gap-2">
                    <Award className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-bold text-xs">Desde 1993</p>
                      <p className="text-[10px] text-muted-foreground">Tradição Ashby</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Depoimentos ── */}
      <section className="py-24 sm:py-32 bg-gradient-to-b from-primary/[0.05] via-muted/30 to-transparent">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="mb-14">
            <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
              <span className="w-8 h-px bg-primary" />
              Depoimentos
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              O que nossos clientes dizem
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i}
                className="rounded-2xl border border-border/40 bg-card/60 p-6 hover:border-primary/25 transition-colors duration-300"
              >
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, j) => (
                    <Star key={j} className="w-4 h-4 text-primary fill-primary" />
                  ))}
                </div>
                <p className="text-muted-foreground mb-5 leading-relaxed italic">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-sm">{t.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section id="faq" className="py-24 sm:py-32">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="mb-10">
            <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
              <span className="w-8 h-px bg-primary" />
              FAQ
            </p>
            <h2 className="text-3xl sm:text-4xl font-extrabold">
              Perguntas Frequentes
            </h2>
          </div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqItems.map((item, i) => (
              <AccordionItem key={i} value={`item-${i}`}
                className="border border-border/40 rounded-xl px-5 bg-card/60 data-[state=open]:border-primary/30 data-[state=open]:bg-card/80 transition-colors duration-300"
              >
                <AccordionTrigger className="text-left hover:no-underline py-4 text-sm font-medium hover:text-primary transition-colors duration-200">
                  {item.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground pb-4 leading-relaxed">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ── Contato ── */}
      <section id="contato" className="py-24 sm:py-32 bg-gradient-to-b from-primary/[0.05] via-muted/20 to-background">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-12">
            <div className="space-y-6">
              <div>
                <p className="text-primary font-semibold text-sm tracking-widest uppercase mb-2 flex items-center gap-2">
                  <span className="w-8 h-px bg-primary" />
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
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <c.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{c.label}</p>
                      <p className="text-sm font-medium">{c.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <a href={INSTAGRAM_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Instagram className="w-4 h-4" /> @taubatechopp
              </a>
            </div>

            <div className="rounded-2xl border border-border/40 bg-card/70 p-6 sm:p-8 shadow-xl shadow-primary/5">
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="nome" className="text-xs">Nome *</Label>
                    <Input id="nome" placeholder="Seu nome" value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="h-11 rounded-lg bg-background/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="telefone" className="text-xs">Telefone *</Label>
                    <Input id="telefone" placeholder="(12) 99999-9999" value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="h-11 rounded-lg bg-background/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs">E-mail</Label>
                  <Input id="email" type="email" placeholder="seu@email.com" value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="h-11 rounded-lg bg-background/50" />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="tipoEvento" className="text-xs">Tipo de Evento</Label>
                    <Input id="tipoEvento" placeholder="Ex: Casamento" value={formData.tipoEvento}
                      onChange={(e) => setFormData({ ...formData, tipoEvento: e.target.value })}
                      className="h-11 rounded-lg bg-background/50" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="dataEvento" className="text-xs">Data do Evento</Label>
                    <Input id="dataEvento" type="date" value={formData.dataEvento}
                      onChange={(e) => setFormData({ ...formData, dataEvento: e.target.value })}
                      className="h-11 rounded-lg bg-background/50" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="mensagem" className="text-xs">Mensagem</Label>
                  <Textarea id="mensagem" placeholder="Conte sobre seu evento..." rows={3} value={formData.mensagem}
                    onChange={(e) => setFormData({ ...formData, mensagem: e.target.value })}
                    className="rounded-lg bg-background/50 resize-none" />
                </div>
                <Button
                  className="w-full h-12 bg-primary text-primary-foreground font-bold rounded-lg shadow-md shadow-primary/20"
                  onClick={handleWhatsApp} disabled={isSubmitting}
                >
                  {isSubmitting ? <><Loader2 className="mr-2 w-4 h-4 animate-spin" />Enviando...</> :
                    <><Send className="mr-2 w-4 h-4" />Enviar via WhatsApp</>}
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">Seus dados serão salvos para facilitar o atendimento</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="relative py-10 border-t border-border/30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoTaubateChopp} alt="Taubaté Chopp" className="h-8 w-8 rounded-full object-cover" />
            <div>
              <p className="font-semibold text-sm">Taubaté Chopp</p>
              <p className="text-xs text-muted-foreground">Distribuidor Oficial Ashby</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} Taubaté Chopp. Todos os direitos reservados.</p>
        </div>
      </footer>

      {/* ── WhatsApp Float ── */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-colors"
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </a>
    </div>
  );
}
