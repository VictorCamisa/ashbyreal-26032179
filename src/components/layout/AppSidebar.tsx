import { useLocation, NavLink } from 'react-router-dom';
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
  ChevronsUpDown,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  useSidebar,
} from '@/components/ui/sidebar';
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

const mainNavItems = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { key: 'clientes', label: 'Clientes', href: '/clientes', icon: Users },
  { key: 'crm', label: 'CRM', href: '/crm', icon: Target },
];

const operationsNavItems = [
  { key: 'barris', label: 'Barris', href: '/barris', icon: Circle },
  { key: 'estoque', label: 'Estoque', href: '/estoque', icon: Package },
];

const financeNavItems = [
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet },
  { key: 'contabilidade', label: 'Contabilidade', href: '/contabilidade', icon: Calculator },
];

const toolsNavItems = [
  { key: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  { key: 'suporte', label: 'Suporte', href: '/suporte', icon: HeadphonesIcon },
  { key: 'agente-ia', label: 'Agente IA', href: '/agente-ia', icon: Bot },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { data: visibleModules } = useUserModules();
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const filterItems = (items: typeof mainNavItems) => {
    if (!visibleModules) return items;
    return items.filter(item => visibleModules.includes(item.key));
  };

  const groups = useMemo(() => [
    { label: 'Principal', items: filterItems(mainNavItems) },
    { label: 'Operações', items: filterItems(operationsNavItems) },
    { label: 'Financeiro', items: filterItems(financeNavItems) },
    { label: 'Ferramentas', items: filterItems(toolsNavItems) },
  ].filter(g => g.items.length > 0), [visibleModules]);

  const isActive = (href: string) => {
    if (href === '/dashboard') return location.pathname === '/dashboard';
    return location.pathname.startsWith(href);
  };

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      {/* Header / Logo */}
      <SidebarHeader className="p-3">
        <NavLink to="/dashboard" className="flex items-center gap-2.5 group px-1">
          <div className="relative shrink-0">
            <img
              src={logoTaubateChopp}
              alt="Taubaté Chopp"
              className="h-8 w-8 rounded-lg object-cover ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 bg-success rounded-full ring-2 ring-sidebar" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight truncate">Taubaté Chopp</span>
              <span className="text-[10px] text-muted-foreground truncate">Sistema de Gestão</span>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarSeparator />

      {/* Navigation */}
      <SidebarContent className="px-1">
        {groups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      tooltip={item.label}
                    >
                      <NavLink to={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarSeparator />

      {/* Footer / User */}
      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/configuracoes')} tooltip="Configurações">
              <NavLink to="/configuracoes">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent"
                >
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] font-bold bg-primary text-primary-foreground">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-semibold truncate">
                        {user?.email?.split('@')[0] || 'Usuário'}
                      </span>
                      <span className="text-[10px] text-muted-foreground truncate">
                        {user?.email || ''}
                      </span>
                    </div>
                  )}
                  {!isCollapsed && <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isCollapsed ? "right" : "top"}
                align="start"
                className="w-56 rounded-xl"
              >
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
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
