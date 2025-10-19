import { 
  LayoutDashboard, 
  Users, 
  ShoppingCart, 
  Package, 
  MessageSquare, 
  HeadphonesIcon, 
  Settings,
  TrendingUp
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';

const menuItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'CRM', url: '/crm', icon: TrendingUp },
  { title: 'Clientes', url: '/clientes', icon: Users },
  { title: 'Pedidos', url: '/pedidos', icon: ShoppingCart },
  { title: 'Estoque', url: '/estoque', icon: Package },
  { title: 'WhatsApp', url: '/whatsapp', icon: MessageSquare },
  { title: 'Suporte', url: '/suporte', icon: HeadphonesIcon },
  { title: 'Configurações', url: '/configuracoes', icon: Settings },
];

export function AppSidebar() {
  const { open } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-secondary font-bold text-lg px-4 py-6">
            {open && 'Ashby Cervejaria'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink 
                      to={item.url} 
                      end
                      className={({ isActive }) =>
                        isActive ? 'bg-sidebar-accent' : ''
                      }
                    >
                      <item.icon className="h-5 w-5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
