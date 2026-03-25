import { NavLink, useLocation } from 'react-router-dom';
import {
  Home, 
  ShoppingCart, 
  Wallet,
  Calculator,
  Target,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUserModules } from '@/hooks/useAdminUsers';
import { useMemo } from 'react';

const allNavItems = [
  { key: 'hub', label: 'Início', href: '/hub', icon: Home },
  { key: 'pedidos', label: 'Pedidos', href: '/pedidos', icon: ShoppingCart },
  { key: 'crm', label: 'CRM', href: '/crm', icon: Target },
  { key: 'financeiro', label: 'Financeiro', href: '/financeiro', icon: Wallet },
  { key: 'contabilidade', label: 'Contab.', href: '/contabilidade', icon: Calculator },
];

export function MobileNavBar() {
  const { data: visibleModules } = useUserModules();
  const location = useLocation();

  const navItems = useMemo(() => {
    if (!visibleModules) return allNavItems;
    return allNavItems.filter(item => item.key === 'hub' || visibleModules.includes(item.key));
  }, [visibleModules]);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-card/80 backdrop-blur-2xl border-t border-border/30 safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center flex-1 py-1 gap-1 transition-all duration-200 rounded-xl",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground active:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "p-1.5 rounded-xl transition-all duration-200",
                  isActive && "bg-primary/10"
                )}>
                  <item.icon className={cn("h-5 w-5", isActive && "stroke-[2.5]")} />
                </div>
                <span className={cn(
                  "text-[10px] font-medium leading-none",
                  isActive && "font-semibold text-primary"
                )}>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
