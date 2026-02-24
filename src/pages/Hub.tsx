import { NavLink, useNavigate } from 'react-router-dom';
import { useMemo } from 'react';
import {
  LayoutDashboard,
  Users,
  Target,
  ShoppingCart,
  Package,
  Wallet,
  MessageCircle,
  HeadphonesIcon,
  Settings,
  LogOut,
  Calculator,
  Bot,
  Circle,
  Megaphone,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUserModules } from '@/hooks/useAdminUsers';
import logoTaubateChopp from '@/assets/logo-taubate-chopp.jpeg';
import { motion } from 'framer-motion';

interface ModuleItem {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
}

const moduleGroups: { label: string; description: string; items: ModuleItem[] }[] = [
  {
    label: 'Principal',
    description: 'Visão geral e gestão comercial',
    items: [
      { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, description: 'Visão completa do negócio' },
      { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart, description: 'Vendas e entregas' },
      { key: 'clientes', label: 'Clientes', href: '/clientes', icon: Users, description: 'Base de clientes' },
      { key: 'crm', label: 'CRM', href: '/crm', icon: Target, description: 'Pipeline e oportunidades' },
    ],
  },
  {
    label: 'Operações',
    description: 'Controle operacional',
    items: [
      { key: 'barris', label: 'Barris', href: '/barris', icon: Circle, description: 'Rastreamento de barris' },
      { key: 'estoque', label: 'Estoque', href: '/estoque', icon: Package, description: 'Produtos e inventário' },
    ],
  },
  {
    label: 'Financeiro',
    description: 'Gestão financeira e fiscal',
    items: [
      { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet, description: 'Transações e fluxo de caixa' },
      { key: 'contabilidade', label: 'Contabilidade', href: '/contabilidade', icon: Calculator, description: 'Notas fiscais e DRE' },
    ],
  },
  {
    label: 'Ferramentas',
    description: 'Comunicação e automação',
    items: [
      { key: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle, description: 'Mensagens e conversas' },
      { key: 'marketing', label: 'Marketing', href: '/marketing', icon: Megaphone, description: 'Campanhas e disparos' },
      { key: 'suporte', label: 'Suporte', href: '/suporte', icon: HeadphonesIcon, description: 'Tickets e atendimento' },
      { key: 'agente-ia', label: 'Agente IA', href: '/agente-ia', icon: Bot, description: 'Automação inteligente' },
    ],
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const groupVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
};

export default function Hub() {
  const { user, signOut } = useAuth();
  const { data: visibleModules } = useUserModules();

  const filteredGroups = useMemo(() => {
    return moduleGroups
      .map((group) => ({
        ...group,
        items: visibleModules
          ? group.items.filter((item) => visibleModules.includes(item.key))
          : group.items,
      }))
      .filter((g) => g.items.length > 0);
  }, [visibleModules]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-panel border-b border-border/40">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <div className="relative">
                <img
                  src={logoTaubateChopp}
                  alt="Taubaté Chopp"
                  className="h-9 w-9 rounded-xl object-cover ring-1 ring-primary/20"
                />
                <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-success rounded-full ring-2 ring-background" />
              </div>
              <div>
                <h1 className="text-sm font-bold tracking-tight">Taubaté Chopp</h1>
                <p className="text-[10px] text-muted-foreground">Sistema de Gestão</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold truncate">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/configuracoes" className="cursor-pointer text-xs">
                      <Settings className="h-3.5 w-3.5 mr-2" />
                      Configurações
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-destructive focus:text-destructive cursor-pointer text-xs"
                  >
                    <LogOut className="h-3.5 w-3.5 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        {/* Welcome */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 sm:mb-12"
        >
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground font-medium">
              Olá, {user?.email?.split('@')[0] || 'Usuário'}
            </p>
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            O que vamos fazer hoje?
          </h2>
        </motion.div>

        {/* Module Groups */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8 sm:space-y-10"
        >
          {filteredGroups.map((group) => (
            <motion.section key={group.label} variants={groupVariants}>
              <div className="mb-3 sm:mb-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70">
                  {group.label}
                </h3>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">
                  {group.description}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {group.items.map((item) => (
                  <motion.div key={item.key} variants={cardVariants}>
                    <NavLink
                      to={item.href}
                      className="group relative flex flex-col justify-between p-4 sm:p-5 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 h-full min-h-[120px] sm:min-h-[140px]"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                            <item.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300" />
                        </div>
                        <h4 className="text-sm sm:text-base font-semibold tracking-tight group-hover:text-primary transition-colors">
                          {item.label}
                        </h4>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground/60 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </NavLink>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
