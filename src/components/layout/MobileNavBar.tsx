import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Package, 
  Wallet,
  Menu,
  Users,
  Circle,
  MessageCircle,
  Bot,
  Calculator,
  HeadphonesIcon,
  Target
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserModules } from '@/hooks/useAdminUsers';
import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

const allNavItems = [
  { key: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { key: 'clientes', label: 'Clientes', href: '/clientes', icon: Users },
  { key: 'crm', label: 'CRM', href: '/crm', icon: Target },
  { key: 'barris', label: 'Barris', href: '/barris', icon: Circle },
  { key: 'estoque', label: 'Estoque', href: '/estoque', icon: Package },
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet },
  { key: 'contabilidade', label: 'Contab.', href: '/contabilidade', icon: Calculator },
  { key: 'whatsapp', label: 'WhatsApp', href: '/whatsapp', icon: MessageCircle },
  { key: 'suporte', label: 'Suporte', href: '/suporte', icon: HeadphonesIcon },
  { key: 'agente-ia', label: 'IA', href: '/agente-ia', icon: Bot },
];

// Priority order for quick access (max 4 in bottom bar)
const priorityOrder = ['dashboard', 'pedidos', 'financeiro', 'clientes'];

export function MobileNavBar() {
  const { data: visibleModules } = useUserModules();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Filter nav items based on user's visible modules
  const navItems = useMemo(() => {
    if (!visibleModules) return allNavItems;
    return allNavItems.filter(item => visibleModules.includes(item.key));
  }, [visibleModules]);

  // Get priority items for bottom bar (max 4)
  const bottomBarItems = useMemo(() => {
    const priorityItems = priorityOrder
      .map(key => navItems.find(item => item.key === key))
      .filter(Boolean) as typeof navItems;
    
    // If we have less than 3 priority items, add others
    if (priorityItems.length < 3) {
      const remaining = navItems.filter(item => !priorityOrder.includes(item.key));
      return [...priorityItems, ...remaining].slice(0, 4);
    }
    
    // Return max 3 items + "More" button
    return priorityItems.slice(0, 3);
  }, [navItems]);

  // Items for the "More" sheet (all items not in bottom bar)
  const moreItems = useMemo(() => {
    const bottomBarKeys = bottomBarItems.map(item => item.key);
    return navItems.filter(item => !bottomBarKeys.includes(item.key));
  }, [navItems, bottomBarItems]);

  // Check if current route is in "more" section
  const isMoreActive = useMemo(() => {
    return moreItems.some(item => location.pathname === item.href || 
      (item.href !== '/dashboard' && location.pathname.startsWith(item.href)));
  }, [moreItems, location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {bottomBarItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/dashboard'}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors rounded-lg mx-0.5",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:bg-muted"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-colors",
                  isActive && "bg-primary/10"
                )}>
                  <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                </div>
                <span className="text-[10px] font-medium leading-tight">{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More button with sheet */}
        {moreItems.length > 0 && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-2 gap-0.5 transition-colors rounded-lg mx-0.5",
                  isMoreActive
                    ? "text-primary"
                    : "text-muted-foreground active:bg-muted"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-colors",
                  isMoreActive && "bg-primary/10"
                )}>
                  <Menu className={cn("h-5 w-5", isMoreActive && "stroke-[2.5]")} />
                </div>
                <span className="text-[10px] font-medium leading-tight">Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-2xl">
              <div className="pt-2 pb-6">
                <div className="grid grid-cols-4 gap-3 px-2">
                  {moreItems.map((item) => (
                    <NavLink
                      key={item.href}
                      to={item.href}
                      onClick={() => setSheetOpen(false)}
                      className={({ isActive }) =>
                        cn(
                          "flex flex-col items-center justify-center p-3 rounded-xl transition-colors gap-1.5",
                          isActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted active:bg-muted"
                        )
                      }
                    >
                      <item.icon className="h-6 w-6" />
                      <span className="text-xs font-medium text-center leading-tight">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
