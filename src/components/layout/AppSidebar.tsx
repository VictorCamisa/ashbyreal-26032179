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
  User
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

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
  const { user, signOut } = useAuth();

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
      
      <SidebarFooter>
        <Separator className="mb-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <div className="px-4 py-2">
              {open ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="bg-primary text-primary-foreground rounded-full p-2">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-sm font-medium truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => signOut()}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => signOut()}
                  title="Sair"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
