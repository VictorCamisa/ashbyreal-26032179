import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ShoppingCart, 
  Plus, 
  Eye,
  Calendar,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pedido {
  id: string;
  numero_pedido: number;
  status: string;
  valor_total: number;
  data_pedido: string;
  data_entrega: string | null;
  observacoes: string | null;
  metodo_pagamento: string | null;
  itens?: {
    id: string;
    quantidade: number;
    preco_unitario: number;
    subtotal: number;
    produto?: {
      nome: string;
    } | null;
  }[];
}

interface ClientePedidosTabProps {
  pedidos: Pedido[];
  clienteId: string;
  onRefresh: () => void;
}

const statusConfig: Record<string, { label: string; icon: typeof Clock; className: string }> = {
  pendente: { 
    label: 'Pendente', 
    icon: Clock, 
    className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
  },
  confirmado: { 
    label: 'Confirmado', 
    icon: CheckCircle, 
    className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' 
  },
  em_separacao: { 
    label: 'Em Separação', 
    icon: Package, 
    className: 'bg-purple-500/10 text-purple-500 border-purple-500/20' 
  },
  enviado: { 
    label: 'Enviado', 
    icon: Truck, 
    className: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20' 
  },
  entregue: { 
    label: 'Entregue', 
    icon: CheckCircle, 
    className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
  },
  cancelado: { 
    label: 'Cancelado', 
    icon: XCircle, 
    className: 'bg-destructive/10 text-destructive border-destructive/20' 
  },
};

export function ClientePedidosTab({ pedidos, clienteId, onRefresh }: ClientePedidosTabProps) {
  const navigate = useNavigate();

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const getStatusBadge = (status: string) => {
    const config = statusConfig[status] || statusConfig.pendente;
    const Icon = config.icon;
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  return (
    <Card className="border-border/50">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Histórico de Pedidos</CardTitle>
        <Button size="sm" className="gap-2" onClick={() => navigate('/pedidos')}>
          <Plus className="h-4 w-4" />
          Novo Pedido
        </Button>
      </CardHeader>
      <CardContent>
        {pedidos.length > 0 ? (
          <div className="space-y-4">
            {pedidos.map((pedido) => (
              <div 
                key={pedido.id} 
                className="border border-border rounded-lg p-4 hover:bg-accent/50 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <ShoppingCart className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Pedido #{pedido.numero_pedido}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(pedido.data_pedido)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(pedido.status)}
                  </div>
                </div>

                {/* Items preview */}
                {pedido.itens && pedido.itens.length > 0 && (
                  <div className="mb-3 pl-11">
                    <div className="text-xs text-muted-foreground space-y-1">
                      {pedido.itens.slice(0, 3).map((item) => (
                        <div key={item.id} className="flex justify-between">
                          <span>{item.quantidade}x {item.produto?.nome || 'Produto'}</span>
                          <span>{formatCurrency(item.subtotal)}</span>
                        </div>
                      ))}
                      {pedido.itens.length > 3 && (
                        <p className="text-muted-foreground">
                          +{pedido.itens.length - 3} itens
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {pedido.data_entrega && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Entrega: {formatDate(pedido.data_entrega)}
                      </span>
                    )}
                    {pedido.metodo_pagamento && (
                      <span className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {pedido.metodo_pagamento}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-primary">
                      {formatCurrency(pedido.valor_total)}
                    </span>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => navigate(`/pedidos?pedido=${pedido.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground mb-4">Nenhum pedido realizado</p>
            <Button variant="outline" onClick={() => navigate('/pedidos')}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro pedido
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
