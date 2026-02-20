import { useEffect, useCallback, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
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
  Maximize,
  Minimize,
  Calculator,
  Bot,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/useAuth';
import { useUserModules } from '@/hooks/useAdminUsers';
import { cn } from '@/lib/utils';
import logoTaubateChopp from '@/assets/logo-taubate-chopp.jpeg';

const allNavItems = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'clientes', label: 'Clientes', href: '/clientes', icon: Users },
  { key: 'crm', label: 'CRM', href: '/crm', icon: Target },
  { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { key: 'barris', label: 'Barris', href: '/barris', icon: Circle },
  { key: 'estoque', label: 'Estoque', href: '/estoque', icon: Package },
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet },
  { key: 'contabilidade', label: 'Contabilidade', href: '/contabilidade', icon: Calculator },
  { key: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  { key: 'suporte', label: 'Suporte', href: '/suporte', icon: HeadphonesIcon },
  { key: 'agente-ia', label: 'Agente IA', href: '/agente-ia', icon: Bot },
];

export function TopNavbar() {
  const { user, signOut } = useAuth();
  const { data: visibleModules } = useUserModules();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const navItems = useMemo(() => {
    if (!visibleModules) return allNavItems;
    return allNavItems.filter(item => visibleModules.includes(item.key));
  }, [visibleModules]);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(console.error);
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={cn(
      "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
      scrolled 
        ? "glass-panel shadow-sm" 
        : "bg-background/80 backdrop-blur-md border-b border-border/40"
    )}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <NavLink to="/dashboard" className="flex items-center gap-2.5 group">
            <div className="relative">
              <img 
                src={logoTaubateChopp} 
                alt="Taubaté Chopp" 
                className="h-8 w-8 rounded-xl object-cover ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300"
              />
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-success rounded-full ring-2 ring-background" />
            </div>
            <span className="font-bold text-sm hidden sm:block tracking-tight">
              Taubaté Chopp
            </span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-0.5 max-w-[calc(100vw-400px)] overflow-x-auto scrollbar-none">
            <div className="flex items-center gap-0.5 min-w-max bg-muted/50 rounded-xl p-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === '/dashboard'}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0",
                      isActive
                        ? "bg-background text-foreground shadow-sm ring-1 ring-border/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                    )
                  }
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-1.5">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 hidden sm:flex rounded-lg"
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
            </Button>
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl">
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
  );
}
