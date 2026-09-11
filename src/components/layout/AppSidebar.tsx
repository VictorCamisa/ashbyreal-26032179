import { useLocation, NavLink } from 'react-router-dom';
import { useMemo } from 'react';
import {
  Home,
  BarChart3,
  ShoppingCart,
  Target,
  Users,
  Store,
  Boxes,
  Droplets,
  Wallet,
  Calculator,
  TrendingUp,
  MessageSquare,
  Bot,
  Megaphone,
  HelpCircle,
  Settings,
  LogOut,
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
import logoTaubateChopp from '@/assets/logo-taubate-chopp.jpeg';

const principalItems = [
  { key: 'hub', label: 'Início', href: '/hub', icon: Home },
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: BarChart3 },
];

const salesNavItems = [
  { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { key: 'crm', label: 'CRM', href: '/crm', icon: Target },
  { key: 'clientes', label: 'Clientes', href: '/clientes', icon: Users },
  { key: 'lojistas', label: 'Lojistas', href: '/lojistas', icon: Store },
];

const operationItems = [
  { key: 'estoque', label: 'Estoque', href: '/estoque', icon: Boxes },
  { key: 'barris', label: 'Barris', href: '/barris', icon: Droplets },
];

const financeNavItems = [
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet },
  { key: 'contabilidade', label: 'Contabilidade', href: '/contabilidade', icon: Calculator },
  { key: 'analise-financeira', label: 'Análise Financeira', href: '/analise-financeira', icon: TrendingUp },
];

const channelsIAItems = [
  { key: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageSquare },
  { key: 'agente-ia', label: 'Agente IA', href: '/agente-ia', icon: Bot },
  { key: 'marketing', label: 'Marketing', href: '/marketing', icon: Megaphone },
  { key: 'suporte', label: 'Suporte', href: '/suporte', icon: HelpCircle },
];

export function AppSidebar() {
  const { user, signOut } = useAuth();
  const { data: visibleModules } = useUserModules();
  const location = useLocation();
  const { state } = useSidebar();
  const isCollapsed = state === 'collapsed';

  const filterItems = (items: typeof salesNavItems) => {
    return items;
  };

  const groups = useMemo(() => [
    { label: 'Principal', items: filterItems(principalItems) },
    { label: 'Vendas & CRM', items: filterItems(salesNavItems) },
    { label: 'Operação & Estoque', items: filterItems(operationItems) },
    { label: 'Financeiro & Fiscal', items: filterItems(financeNavItems) },
    { label: 'Canais & IA', items: filterItems(channelsIAItems) },
  ], []);

  const isActive = (href: string) => location.pathname === href || (href !== '/hub' && location.pathname.startsWith(href));

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <SidebarHeader className="p-3">
        <NavLink to="/hub" className="flex items-center gap-2.5 group px-1">
          <div className="relative shrink-0">
            <img
              src={logoTaubateChopp}
              alt="Taubaté Chopp"
              className="h-8 w-8 rounded-lg object-cover ring-1 ring-primary/20 group-hover:ring-primary/50 transition-all"
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-success ring-2 ring-sidebar" />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-bold tracking-tight truncate">Taubaté Chopp</span>
              <span className="text-[10px] text-sidebar-foreground/60 truncate">Sistema de Gestão</span>
            </div>
          )}
        </NavLink>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="px-2 py-2 space-y-4">
        {groups.map((group) => (
          <SidebarGroup key={group.label} className="p-0">
            {!isCollapsed && (
              <SidebarGroupLabel className="text-[9px] uppercase tracking-widest font-semibold text-sidebar-foreground/50 px-2 mb-1.5">
                {group.label}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild isActive={isActive(item.href)} tooltip={item.label} className="h-8 text-xs">
                      <NavLink to={item.href}>
                        <item.icon className="h-4 w-4 shrink-0" />
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

      <SidebarFooter className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={isActive('/configuracoes')} tooltip="Configurações" className="h-8 text-xs">
              <NavLink to="/configuracoes">
                <Settings className="h-4 w-4" />
                <span>Configurações</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent h-10">
                  <Avatar className="h-7 w-7 shrink-0">
                    <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
                      {user?.email?.charAt(0).toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  {!isCollapsed && (
                    <div className="flex flex-col min-w-0 flex-1 text-left">
                      <span className="text-xs font-semibold truncate">
                        {user?.email?.split('@')[0] || 'Usuário'}
                      </span>
                      <span className="text-[10px] text-sidebar-foreground/60 truncate">
                        {user?.email || ''}
                      </span>
                    </div>
                  )}
                  {!isCollapsed && <ChevronsUpDown className="ml-auto h-3.5 w-3.5 text-sidebar-foreground/60" />}
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side={isCollapsed ? "right" : "top"}
                align="start"
                className="w-52 rounded-xl"
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

    </Sidebar>
  );
}
