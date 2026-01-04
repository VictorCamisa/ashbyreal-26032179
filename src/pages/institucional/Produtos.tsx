import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Beer, 
  Award, 
  ArrowLeft,
  MessageCircle,
  Search,
  Droplets,
  Thermometer,
  Percent,
  Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import logoTaubateChopp from '@/assets/logo-taubate-chopp.jpeg';

// Contact info
const WHATSAPP_NUMBER = '551234326712';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
};

const fadeInScale = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] } }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};

// Glassmorphism components
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
      ${className}
    `}
    {...props}
  >
    {children}
  </Button>
);

// Products data based on Ashby
const products = [
  {
    id: 1,
    name: 'Pilsen Clássica',
    category: 'pilsen',
    description: 'A clássica Pilsen Ashby. Corpo leve, sabor suave e refrescante, ideal para o clima brasileiro.',
    abv: '4.5%',
    ibu: 12,
    servingTemp: '0-4°C',
    badge: 'Mais Vendido',
    image: '🍺',
    color: 'from-amber-400 to-amber-500'
  },
  {
    id: 2,
    name: 'Pilsen Puro Malte',
    category: 'pilsen',
    description: 'Produzida exclusivamente com malte de cevada, sem adjuntos. Sabor mais encorpado e aromático.',
    abv: '4.7%',
    ibu: 14,
    servingTemp: '0-4°C',
    badge: null,
    image: '🌾',
    color: 'from-yellow-400 to-amber-500'
  },
  {
    id: 3,
    name: 'Pilsen Escuro',
    category: 'pilsen',
    description: 'Versão escura da Pilsen tradicional. Notas de caramelo e tostado leve com final refrescante.',
    abv: '4.8%',
    ibu: 18,
    servingTemp: '2-6°C',
    badge: null,
    image: '🍫',
    color: 'from-amber-600 to-amber-700'
  },
  {
    id: 4,
    name: 'Pale Ale',
    category: 'especiais',
    description: 'Eleita a melhor do mundo em 2017. Amargor equilibrado, notas frutadas e final seco. Um clássico premiado.',
    abv: '5.0%',
    ibu: 35,
    servingTemp: '4-8°C',
    badge: 'Melhor do Mundo 2017',
    image: '🏆',
    color: 'from-orange-400 to-amber-500'
  },
  {
    id: 5,
    name: 'IPA Nirvana',
    category: 'especiais',
    description: 'IPA com notas cítricas intensas e amargor marcante. Lúpulos americanos em destaque.',
    abv: '6.2%',
    ibu: 55,
    servingTemp: '6-10°C',
    badge: 'Intensa',
    image: '🌟',
    color: 'from-orange-500 to-red-500'
  },
  {
    id: 6,
    name: 'Weiss',
    category: 'especiais',
    description: 'Cerveja de trigo tradicional alemã. Aromas de banana e cravo, corpo leve e refrescante.',
    abv: '5.2%',
    ibu: 12,
    servingTemp: '4-8°C',
    badge: null,
    image: '🍌',
    color: 'from-yellow-300 to-amber-400'
  },
  {
    id: 7,
    name: 'British Strong Ale',
    category: 'premium',
    description: 'Cerveja encorpada com notas de frutas secas e caramelo. Complexidade britânica em cada gole.',
    abv: '7.5%',
    ibu: 40,
    servingTemp: '8-12°C',
    badge: 'Premium',
    image: '🎩',
    color: 'from-red-600 to-red-700'
  },
  {
    id: 8,
    name: 'American Pale Ale',
    category: 'premium',
    description: 'Lúpulos americanos em destaque. Notas cítricas e florais com amargor pronunciado.',
    abv: '5.5%',
    ibu: 45,
    servingTemp: '4-8°C',
    badge: null,
    image: '🌸',
    color: 'from-amber-500 to-orange-500'
  },
  {
    id: 9,
    name: 'Orange Wheat',
    category: 'frutadas',
    description: 'Cerveja de trigo com adição de laranja. Refrescante e cítrica, perfeita para o verão.',
    abv: '4.5%',
    ibu: 10,
    servingTemp: '2-6°C',
    badge: 'Refrescante',
    image: '🍊',
    color: 'from-orange-400 to-yellow-500'
  },
  {
    id: 10,
    name: 'Raspberry Wheat',
    category: 'frutadas',
    description: 'Cerveja de trigo com framboesas. Aroma frutado intenso e sabor levemente adocicado.',
    abv: '4.3%',
    ibu: 8,
    servingTemp: '2-6°C',
    badge: null,
    image: '🫐',
    color: 'from-pink-400 to-red-400'
  }
];

const categories = [
  { id: 'todos', label: 'Todos', icon: Beer },
  { id: 'pilsen', label: 'Pilsen', icon: Droplets },
  { id: 'especiais', label: 'Especiais', icon: Sparkles },
  { id: 'premium', label: 'Premium', icon: Award },
  { id: 'frutadas', label: 'Frutadas', icon: Droplets }
];

export default function ProdutosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('todos');

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = activeCategory === 'todos' || product.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

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
            
            <div className="flex items-center gap-3">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Voltar
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

      {/* Hero */}
      <section className="pt-24 pb-12 bg-gradient-to-b from-amber-500/5 to-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center"
          >
            <motion.div variants={fadeInUp}>
              <Badge variant="outline" className="mb-4 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10">
                <Beer className="w-4 h-4 mr-2" />
                Catálogo Completo
              </Badge>
            </motion.div>
            <motion.h1 variants={fadeInUp} className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
              Chopps <span className="text-amber-500">Ashby</span>
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-muted-foreground max-w-2xl mx-auto mb-8">
              Conheça nossa linha completa de chopps artesanais. 
              Da clássica Pilsen às cervejas especiais premiadas internacionalmente.
            </motion.p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-16 z-40 bg-background/80 backdrop-blur-xl border-b border-border/40 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            {/* Search */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Buscar chopps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Tabs */}
            <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full sm:w-auto">
              <TabsList className="grid grid-cols-5 w-full sm:w-auto">
                {categories.map(cat => (
                  <TabsTrigger key={cat.id} value={cat.id} className="text-xs sm:text-sm">
                    <cat.icon className="w-4 h-4 mr-1 hidden sm:block" />
                    {cat.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredProducts.length > 0 ? (
            <motion.div 
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {filteredProducts.map((product) => (
                <motion.div key={product.id} variants={fadeInScale}>
                  <GlassCard className="h-full overflow-hidden group">
                    {/* Product Image Area */}
                    <div className={`relative h-48 bg-gradient-to-br ${product.color} flex items-center justify-center overflow-hidden`}>
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
                      <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Title & Description */}
                      <div>
                        <h3 className="font-bold text-lg mb-2 group-hover:text-amber-500 transition-colors">
                          {product.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      </div>

                      {/* Specs */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-muted-foreground">ABV:</span>
                          <span className="font-medium">{product.abv}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Droplets className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-muted-foreground">IBU:</span>
                          <span className="font-medium">{product.ibu}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Thermometer className="w-3.5 h-3.5 text-amber-500" />
                          <span className="font-medium">{product.servingTemp}</span>
                        </div>
                      </div>

                      {/* CTA */}
                      <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                        <Button 
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-semibold rounded-xl shadow-lg shadow-amber-500/20"
                          onClick={() => {
                            const message = encodeURIComponent(
                              `Olá! Gostaria de saber mais sobre o chopp ${product.name}.`
                            );
                            window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
                          }}
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Consultar Preço
                        </Button>
                      </motion.div>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Beer className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
              <h3 className="text-xl font-semibold mb-2">Nenhum produto encontrado</h3>
              <p className="text-muted-foreground">
                Tente ajustar sua busca ou filtro.
              </p>
            </motion.div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <GlassCard className="p-12">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">
                Pronto para seu <span className="text-amber-500">evento</span>?
              </h2>
              <p className="text-muted-foreground max-w-xl mx-auto mb-8 text-lg">
                Entre em contato conosco para um orçamento personalizado. 
                Nossa equipe está pronta para ajudar você a escolher os melhores chopps.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link to="/#contato">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <Button size="lg" className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-black font-bold rounded-full shadow-lg shadow-amber-500/25 px-8">
                      Solicitar Orçamento
                    </Button>
                  </motion.div>
                </Link>
                <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.98 }}>
                    <GlassButton size="lg" className="rounded-full px-8">
                      <MessageCircle className="w-4 h-4 mr-2 text-green-500" />
                      WhatsApp
                    </GlassButton>
                  </motion.div>
                </a>
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <motion.img 
                src={logoTaubateChopp} 
                alt="Taubaté Chopp" 
                className="h-10 w-10 rounded-full object-cover ring-2 ring-amber-500/20"
                whileHover={{ scale: 1.1 }}
              />
              <span className="text-sm text-muted-foreground">
                Taubaté Chopp - Distribuidor Oficial Ashby
              </span>
            </div>
            <Link to="/" className="text-sm text-muted-foreground hover:text-amber-500 transition-colors">
              ← Voltar ao início
            </Link>
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
        transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
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
