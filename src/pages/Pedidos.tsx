import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Beer, ShoppingCart, Package, DollarSign, Clock } from 'lucide-react';
import { usePedidos } from '@/hooks/usePedidos';
import { NovoPedidoGeralDialog } from '@/components/pedidos/NovoPedidoGeralDialog';
import { VincularAshbyDialog } from '@/components/pedidos/VincularAshbyDialog';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';

const statusColors: Record<string, string> = {
  pendente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  pago: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  entregue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  cancelado: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
};

export default function Pedidos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  const [showVincularAshby, setShowVincularAshby] = useState(false);
  const { pedidos, isLoading, refetch } = usePedidos();

  useEffect(() => {
    fetchClientes();
  }, []);

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, nome');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(c => map[c.id] = c.nome);
      setClientesMap(map);
    }
  };

  const filteredPedidos = pedidos.filter(pedido =>
    clientesMap[pedido.clienteId]?.toLowerCase().includes(searchTerm.toLowerCase()) || false
  );

  const handleVincularAshby = (pedido: any) => {
    setSelectedPedido(pedido);
    setShowVincularAshby(true);
  };

  const totalValue = pedidos.reduce((acc, p) => acc + p.valorTotal, 0);
  const pendentes = pedidos.filter(p => p.status === 'pendente').length;
  const entregues = pedidos.filter(p => p.status === 'entregue').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Pedidos"
        subtitle="Gestão de vendas e entregas"
        icon={ShoppingCart}
        actions={
          <NovoPedidoGeralDialog onSuccess={refetch} />
        }
      />

      {/* KPIs */}
      <KPIGrid>
        <KPICard label="Total Pedidos" value={pedidos.length} icon={Package} />
        <KPICard label="Pendentes" value={pendentes} icon={Clock} variant="warning" />
        <KPICard label="Entregues" value={entregues} icon={ShoppingCart} variant="success" />
        <KPICard 
          label="Valor Total" 
          value={`R$ ${(totalValue / 1000).toFixed(1)}k`} 
          icon={DollarSign} 
        />
      </KPIGrid>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11 h-11"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium">Pedido</TableHead>
                  <TableHead className="font-medium">Cliente</TableHead>
                  <TableHead className="font-medium">Valor</TableHead>
                  <TableHead className="font-medium">Status</TableHead>
                  <TableHead className="font-medium">Data</TableHead>
                  <TableHead className="font-medium text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                      Nenhum pedido encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPedidos.map((pedido) => (
                    <TableRow key={pedido.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">#{pedido.id.slice(0, 8)}</TableCell>
                      <TableCell>{clientesMap[pedido.clienteId] || '-'}</TableCell>
                      <TableCell className="font-medium">
                        R$ {pedido.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={statusColors[pedido.status] || 'bg-muted'}>
                          {pedido.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleVincularAshby(pedido)}
                          className="h-8 px-3 text-xs"
                        >
                          <Beer className="h-3.5 w-3.5 mr-1.5" />
                          Ashby
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm">
        <p className="text-muted-foreground">{filteredPedidos.length} pedidos</p>
        <p className="font-medium">
          Total: R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      </div>

      {selectedPedido && (
        <VincularAshbyDialog
          open={showVincularAshby}
          onOpenChange={setShowVincularAshby}
          pedido={selectedPedido}
        />
      )}
    </div>
  );
}
