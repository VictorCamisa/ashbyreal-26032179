import { useState, useEffect, useCallback } from 'react';
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
  Menu,
  X,
  LogOut,
  Circle,
  Maximize,
  Minimize,
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
import { cn } from '@/lib/utils';
import logoTaubateChopp from '@/assets/logo-taubate-chopp.jpeg';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Clientes', href: '/clientes', icon: Users },
  { label: 'CRM', href: '/crm', icon: Target },
  { label: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { label: 'Barris', href: '/barris', icon: Circle },
  { label: 'Estoque', href: '/estoque', icon: Package },
  { label: 'Financeiro', href: '/financeiro', icon: Wallet },
  { label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  { label: 'Suporte', href: '/suporte', icon: HeadphonesIcon },
];

export function TopNavbar() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background border-b border-border">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo - goes to Dashboard when in system */}
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <img 
              src={logoTaubateChopp} 
              alt="Taubaté Chopp" 
              className="h-8 w-8 rounded-lg object-cover"
            />
            <span className="font-semibold hidden sm:block">Taubaté Chopp</span>
          </NavLink>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center bg-secondary/50 rounded-full px-1 py-1">
            {navItems.map((item) => (
              <NavLink
                key={item.href}
                to={item.href}
                end={item.href === '/dashboard'}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                    isActive
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Sair do fullscreen' : 'Fullscreen'}
            >
              {isFullscreen ? (
                <Minimize className="h-4 w-4" />
              ) : (
                <Maximize className="h-4 w-4" />
              )}
            </Button>
            <ThemeToggle />
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <NavLink to="/configuracoes" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Configurações
                  </NavLink>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => signOut()}
                  className="text-destructive focus:text-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button 
              variant="ghost" 
              size="icon" 
              className="lg:hidden h-8 w-8"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border bg-background animate-fade-in">
          <div className="mx-auto max-w-7xl px-4 py-3">
            <nav className="grid grid-cols-2 gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.href}
                  to={item.href}
                  end={item.href === '/dashboard'}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm transition-colors",
                      isActive
                        ? "bg-secondary text-foreground font-medium"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    )
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}
