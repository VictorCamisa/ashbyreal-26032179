import { NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import {
  ShoppingCart,
  Wallet,
  Settings,
  LogOut,
  Calculator,
  Target,
  ArrowRight,
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
}

const moduleGroups: { label: string; items: ModuleItem[] }[] = [
  {
    label: 'Vendas',
    items: [
      { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart, description: 'Vendas e entregas' },
      { key: 'crm', label: 'CRM', href: '/crm', icon: Target, description: 'Pipeline e oportunidades' },
    ],
  },
  {
    label: 'Financeiro',
    items: [
      { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet, description: 'Transações e fluxo de caixa' },
      { key: 'contabilidade', label: 'Contabilidade', href: '/contabilidade', icon: Calculator, description: 'Notas fiscais e DRE' },
    ],
  },
];

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

  const firstName = user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-3">
              <img
                src={logoTaubateChopp}
                alt="Taubaté Chopp"
                className="h-8 w-8 rounded-lg object-cover"
              />
              <span className="text-sm font-semibold">Taubaté Chopp</span>
            </div>

            <div className="flex items-center gap-1.5">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg">
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className="text-xs font-semibold bg-primary text-primary-foreground">
                        {user?.email?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <div className="px-3 py-2">
                    <p className="text-xs font-medium truncate">{user?.email}</p>
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

      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-8 sm:py-12">
        <div className="mb-10">
          <p className="text-sm text-muted-foreground mb-1">Olá, {firstName}</p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            O que vamos fazer hoje?
          </h2>
        </div>

        <div className="space-y-10">
          {filteredGroups.map((group) => (
            <section key={group.label}>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
                {group.label}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.items.map((item) => (
                  <NavLink
                    key={item.key}
                    to={item.href}
                    className="group flex flex-col justify-between p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-medium transition-all duration-200 min-h-[110px]"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-200">
                        <item.icon className="h-4 w-4" />
                      </div>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/0 group-hover:text-muted-foreground transition-all duration-200" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium">{item.label}</h4>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
