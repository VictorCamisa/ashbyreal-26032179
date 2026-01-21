import { Button } from '@/components/ui/button';
import { 
  Plus, 
  DollarSign, 
  UserPlus, 
  ShoppingCart, 
  Package,
  CreditCard,
  MessageSquare
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    { 
      label: 'Nova Venda', 
      icon: ShoppingCart, 
      onClick: () => navigate('/pedidos'),
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    { 
      label: 'Novo Lead', 
      icon: UserPlus, 
      onClick: () => navigate('/crm'),
      color: 'text-violet-600',
      bgColor: 'bg-violet-100 dark:bg-violet-900/30',
    },
    { 
      label: 'Nova Despesa', 
      icon: DollarSign, 
      onClick: () => navigate('/financeiro'),
      color: 'text-rose-600',
      bgColor: 'bg-rose-100 dark:bg-rose-900/30',
    },
    { 
      label: 'Novo Produto', 
      icon: Package, 
      onClick: () => navigate('/estoque'),
      color: 'text-amber-600',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" className="h-7 w-7 sm:h-8 sm:w-auto sm:px-3 sm:gap-2">
          <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden sm:inline text-sm">Ação Rápida</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {actions.map((action) => (
          <DropdownMenuItem 
            key={action.label} 
            onClick={action.onClick}
            className="cursor-pointer"
          >
            <div className={`h-7 w-7 rounded-lg ${action.bgColor} flex items-center justify-center mr-3`}>
              <action.icon className={`h-4 w-4 ${action.color}`} />
            </div>
            {action.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
