import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Package, 
  MessageSquare, 
  HeadphonesIcon, 
  Settings,
  TrendingUp,
  LogOut,
  User,
  Wallet,
  Menu,
  X
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'CRM', url: '/crm', icon: TrendingUp },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Pedidos', url: '/pedidos', icon: ShoppingCart },
  { title: 'Estoque', url: '/estoque', icon: Package },
  { title: 'WhatsApp', url: '/whatsapp', icon: MessageSquare },
  { title: 'Suporte', url: '/suporte', icon: HeadphonesIcon },
  { title: 'Financeiro', url: '/financeiro', icon: Wallet },
  { title: 'Config', url: '/configuracoes', icon: Settings },
];

export function TopNavbar() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 items-center px-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mr-8">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <span className="text-primary font-bold text-sm">A</span>
          </div>
          <span className="text-base font-semibold hidden sm:inline">Ashby</span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex flex-1 items-center gap-0.5">
          {menuItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.url === '/'}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-all duration-150",
                  isActive 
                    ? "bg-primary/10 text-primary" 
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )
              }
            >
              <item.icon className="h-4 w-4" />
              <span>{item.title}</span>
            </NavLink>
          ))}
        </nav>

        {/* User Menu - Desktop */}
        <div className="hidden lg:flex items-center gap-2 ml-auto">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 h-8 px-2">
                <div className="h-6 w-6 rounded-lg bg-primary/10 flex items-center justify-center">
                  <User className="h-3.5 w-3.5 text-primary" />
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <div className="px-3 py-2">
                <p className="text-xs text-muted-foreground">Conectado como</p>
                <p className="text-sm font-medium truncate">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden ml-auto h-8 w-8"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </Button>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl animate-fade-in">
          <nav className="container py-3 flex flex-col gap-0.5 px-3">
            {menuItems.map((item) => (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.url === '/'}
                onClick={() => setMobileMenuOpen(false)}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-xl transition-all",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-muted-foreground hover:bg-muted/50"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
            
            <div className="mt-3 pt-3 border-t border-border/40 px-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium truncate max-w-[180px]">{user?.email}</span>
                </div>
                <ThemeToggle />
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full rounded-xl"
                onClick={() => {
                  signOut();
                  setMobileMenuOpen(false);
                }}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}