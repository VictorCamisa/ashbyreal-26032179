import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, 
  ShoppingCart, 
  Wallet,
  Menu,
  Calculator,
  Target,
  Settings,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserModules } from '@/hooks/useAdminUsers';
import { useMemo, useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';

const allNavItems = [
  { key: 'hub', label: 'Início', href: '/hub', icon: Home },
  { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { key: 'crm', label: 'CRM', href: '/crm', icon: Target },
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet },
  { key: 'contabilidade', label: 'Contab.', href: '/contabilidade', icon: Calculator },
];

const priorityOrder = ['hub', 'pedidos', 'financeiro', 'crm'];

export function MobileNavBar() {
  const { data: visibleModules } = useUserModules();
  const location = useLocation();
  const [sheetOpen, setSheetOpen] = useState(false);

  const navItems = useMemo(() => {
    if (!visibleModules) return allNavItems;
    return allNavItems.filter(item => visibleModules.includes(item.key));
  }, [visibleModules]);

  const bottomBarItems = useMemo(() => {
    const priorityItems = priorityOrder
      .map(key => navItems.find(item => item.key === key))
      .filter(Boolean) as typeof navItems;
    if (priorityItems.length < 3) {
      const remaining = navItems.filter(item => !priorityOrder.includes(item.key));
      return [...priorityItems, ...remaining].slice(0, 4);
    }
    return priorityItems.slice(0, 3);
  }, [navItems]);

  const moreItems = useMemo(() => {
    const bottomBarKeys = bottomBarItems.map(item => item.key);
    return navItems.filter(item => !bottomBarKeys.includes(item.key));
  }, [navItems, bottomBarItems]);

  const isMoreActive = useMemo(() => {
    return moreItems.some(item => location.pathname === item.href || 
      (item.href !== '/dashboard' && location.pathname.startsWith(item.href)));
  }, [moreItems, location.pathname]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden glass-panel safe-area-bottom">
      <div className="flex items-center justify-around h-[60px] px-1">
        {bottomBarItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            end={item.href === '/dashboard'}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 transition-all rounded-xl mx-0.5",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:bg-muted/50"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-all",
                  isActive && "bg-primary/10 shadow-sm"
                )}>
                  <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                </div>
                <span className={cn(
                  "text-[9px] font-semibold leading-tight",
                  isActive && "text-primary"
                )}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}

        {moreItems.length > 0 && (
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <button
                className={cn(
                  "flex flex-col items-center justify-center flex-1 py-1.5 gap-0.5 transition-all rounded-xl mx-0.5",
                  isMoreActive ? "text-primary" : "text-muted-foreground active:bg-muted/50"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-xl transition-all",
                  isMoreActive && "bg-primary/10 shadow-sm"
                )}>
                  <Menu className={cn("h-5 w-5", isMoreActive && "stroke-[2.5]")} />
                </div>
                <span className="text-[9px] font-semibold leading-tight">Mais</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-auto max-h-[65vh] rounded-t-3xl border-t-0 glass-panel">
              <div className="w-10 h-1 bg-muted-foreground/20 rounded-full mx-auto mb-4 mt-1" />
              <div className="grid grid-cols-4 gap-2 px-1 pb-4">
                {moreItems.map((item) => (
                  <NavLink
                    key={item.href}
                    to={item.href}
                    onClick={() => setSheetOpen(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex flex-col items-center justify-center p-3 rounded-2xl transition-all gap-1.5",
                        isActive
                          ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                          : "text-muted-foreground hover:bg-muted/50 active:bg-muted"
                      )
                    }
                  >
                    <item.icon className="h-5 w-5" />
                    <span className="text-[10px] font-semibold text-center leading-tight">{item.label}</span>
                  </NavLink>
                ))}
                <NavLink
                  to="/configuracoes"
                  onClick={() => setSheetOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex flex-col items-center justify-center p-3 rounded-2xl transition-all gap-1.5",
                      isActive
                        ? "bg-primary/10 text-primary ring-1 ring-primary/20"
                        : "text-muted-foreground hover:bg-muted/50 active:bg-muted"
                    )
                  }
                >
                  <Settings className="h-5 w-5" />
                  <span className="text-[10px] font-semibold text-center leading-tight">Config.</span>
                </NavLink>
              </div>
            </SheetContent>
          </Sheet>
        )}
      </div>
    </nav>
  );
}
