import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import {
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
  Calculator,
  Target,
  ArrowUpRight,
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

interface ModuleItem {
  key: string;
  label: string;
  href: string;
  icon: React.ElementType;
  description: string;
  color: string;
}

const modules: ModuleItem[] = [
  { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart, description: 'Vendas, entregas e ponto de venda', color: 'bg-primary/10 text-primary' },
  { key: 'crm', label: 'CRM', href: '/crm', icon: Target, description: 'Pipeline, oportunidades e leads', color: 'bg-success/10 text-success' },
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet, description: 'Transações, cartões e fluxo de caixa', color: 'bg-warning/10 text-warning' },
  { key: 'contabilidade', label: 'Contabilidade', href: '/contabilidade', icon: Calculator, description: 'Notas fiscais, DRE e reconciliação', color: 'bg-accent text-accent-foreground' },
];

export default function Hub() {
  const { user, signOut } = useAuth();
  const { data: visibleModules } = useUserModules();

  const filteredModules = useMemo(() => {
    if (!visibleModules) return modules;
    return modules.filter((m) => visibleModules.includes(m.key));
  }, [visibleModules]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  const firstName = user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/30">
        <div className="mx-auto max-w-4xl px-5 sm:px-8">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img
                src={logoTaubateChopp}
                alt="Taubaté Chopp"
                className="h-8 w-8 rounded-xl object-cover ring-1 ring-border"
              />
              <span className="text-sm font-semibold hidden sm:block">Taubaté Chopp</span>
            </div>

            <div className="flex items-center gap-1">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 rounded-xl">
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-medium truncate text-muted-foreground">{user?.email}</p>
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/configuracoes" className="cursor-pointer text-sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configurações
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => signOut()}
                    className="text-destructive focus:text-destructive cursor-pointer text-sm"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-5 sm:px-8 py-10 sm:py-16">
        {/* Greeting */}
        <div className="mb-12 animate-fade-in">
          <p className="text-sm text-muted-foreground mb-2">{greeting}, {firstName}</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            O que vamos fazer hoje?
          </h2>
        </div>

        {/* Module Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredModules.map((item, index) => (
            <NavLink
              key={item.key}
              to={item.href}
              className="group relative flex flex-col justify-between p-6 rounded-2xl bg-card border border-border/40 hover:border-primary/25 hover:shadow-elevated transition-all duration-300 ease-out hover:-translate-y-0.5 animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="flex items-start justify-between mb-6">
                <div className={`p-2.5 rounded-xl ${item.color} transition-transform duration-300 group-hover:scale-110`}>
                  <item.icon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-300 translate-x-1 -translate-y-1 group-hover:translate-x-0 group-hover:translate-y-0" />
              </div>
              <div>
                <h3 className="text-base font-semibold mb-1">{item.label}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
