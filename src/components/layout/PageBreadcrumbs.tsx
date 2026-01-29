import { Link, useLocation } from 'react-router-dom';
import { Home } from 'lucide-react';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

interface BreadcrumbRoute {
  path: string;
  label: string;
}

const ROUTE_MAP: Record<string, string> = {
  dashboard: 'Dashboard',
  crm: 'CRM',
  clientes: 'Clientes',
  cliente: 'Cliente',
  pedidos: 'Pedidos',
  barris: 'Barris',
  estoque: 'Estoque',
  suporte: 'Suporte',
  financeiro: 'Financeiro',
  contabilidade: 'Contabilidade',
  'agente-ia': 'Agente IA',
  configuracoes: 'Configurações',
  whatsapp: 'WhatsApp',
};

export function PageBreadcrumbs() {
  const location = useLocation();
  
  // Skip breadcrumbs for root dashboard
  if (location.pathname === '/dashboard') {
    return null;
  }

  const pathParts = location.pathname.split('/').filter(Boolean);
  
  const breadcrumbs: BreadcrumbRoute[] = pathParts.map((part, index) => {
    const path = '/' + pathParts.slice(0, index + 1).join('/');
    // Check if it's a UUID (for dynamic routes like /cliente/:id)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(part);
    const label = isUUID ? 'Detalhes' : (ROUTE_MAP[part] || part.charAt(0).toUpperCase() + part.slice(1));
    
    return { path, label };
  });

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <Breadcrumb className="mb-4">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/dashboard" className="flex items-center gap-1.5">
              <Home className="h-3.5 w-3.5" />
              <span className="sr-only sm:not-sr-only">Início</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          
          return (
            <div key={crumb.path} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.path}>{crumb.label}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
