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
import { Search, Beer, ShoppingCart } from 'lucide-react';
import { usePedidos } from '@/hooks/usePedidos';
import { NovoPedidoGeralDialog } from '@/components/pedidos/NovoPedidoGeralDialog';
import { VincularAshbyDialog } from '@/components/pedidos/VincularAshbyDialog';
import { supabase } from '@/integrations/supabase/client';

const statusColors: Record<string, string> = {
  pendente: 'bg-chart-4/10 text-chart-4 border-chart-4/20',
  pago: 'bg-primary/10 text-primary border-primary/20',
  entregue: 'bg-chart-2/10 text-chart-2 border-chart-2/20',
  cancelado: 'bg-destructive/10 text-destructive border-destructive/20'
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Pedidos</h1>
            <p className="text-sm text-muted-foreground">Gestão de vendas</p>
          </div>
        </div>
        <NovoPedidoGeralDialog onSuccess={refetch} />
      </header>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11 h-11 rounded-xl bg-muted/30 border-border/50"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
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
                  <TableRow key={pedido.id} className="border-border/30 hover:bg-muted/30">
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
      </div>

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