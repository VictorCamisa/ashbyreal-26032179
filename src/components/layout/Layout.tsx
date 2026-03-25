import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { MobileNavBar } from './MobileNavBar';
import { SystemAssistant } from '@/components/assistant/SystemAssistant';
import { useAssistant } from '@/contexts/AssistantContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, LogOut } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { NavLink } from 'react-router-dom';

const MODULE_LABELS: Record<string, string> = {
  '/pedidos': 'Pedidos',
  '/crm': 'CRM',
  '/financeiro': 'Financeiro',
  '/contabilidade': 'Contabilidade',
  '/configuracoes': 'Configurações',
};

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { getModuleInfo } = useAssistant();
  const moduleInfo = getModuleInfo(location.pathname);

  const currentLabel =
    MODULE_LABELS[location.pathname] ||
    Object.entries(MODULE_LABELS).find(([path]) => location.pathname.startsWith(path))?.[1] ||
    'Página';

  return (
    <div className="min-h-screen bg-background">
      {/* Top header bar — floating style */}
      <header className="sticky top-0 z-50 bg-background/70 backdrop-blur-2xl border-b border-border/30">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14">
            {/* Left: back + module name */}
            <div className="flex items-center gap-3 min-w-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0 rounded-xl"
                onClick={() => navigate('/hub')}
                title="Voltar ao início"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <NavLink to="/hub" className="shrink-0 hidden sm:block">
                <img
                  src={logoTaubateChopp}
                  alt="Taubaté Chopp"
                  className="h-7 w-7 rounded-lg object-cover ring-1 ring-border"
                />
              </NavLink>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold tracking-tight truncate">{currentLabel}</h1>
              </div>
            </div>

            {/* Right */}
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

      {/* Main content */}
      <main className="flex-1 pb-20 lg:pb-8">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-5 sm:py-8">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom nav */}
      <MobileNavBar />

      <SystemAssistant
        moduleName={moduleInfo.name}
        moduleContext={moduleInfo.context}
      />
    </div>
  );
}
