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
import { Search, Beer } from 'lucide-react';
import { usePedidos } from '@/hooks/usePedidos';
import { NovoPedidoGeralDialog } from '@/components/pedidos/NovoPedidoGeralDialog';
import { VincularAshbyDialog } from '@/components/pedidos/VincularAshbyDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

const statusColors = {
  pendente: 'bg-yellow-500',
  pago: 'bg-green-500',
  entregue: 'bg-blue-500',
  cancelado: 'bg-red-500'
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
    const { data } = await supabase
      .from('clientes')
      .select('id, nome');
    
    if (data) {
      const map: Record<string, string> = {};
      data.forEach(c => map[c.id] = c.nome);
      setClientesMap(map);
    }
  };

  const filteredPedidos = pedidos.filter(pedido =>
    (clientesMap[pedido.clienteId]?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
  );

  const handleVincularAshby = (pedido: any) => {
    setSelectedPedido(pedido);
    setShowVincularAshby(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gestão de Vendas Manuais e Ashby</p>
        </div>
        <NovoPedidoGeralDialog onSuccess={refetch} />
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou número do pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPedidos.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredPedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">#{pedido.id.slice(0, 8)}</TableCell>
                    <TableCell>{clientesMap[pedido.clienteId] || 'Cliente não encontrado'}</TableCell>
                    <TableCell className="font-bold">
                      R$ {pedido.valorTotal.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2
                      })}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[pedido.status as keyof typeof statusColors] || 'bg-gray-500'}>
                        {pedido.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVincularAshby(pedido)}
                        className="gap-2"
                      >
                        <Beer className="h-4 w-4" />
                        Vincular Ashby
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Mostrando {filteredPedidos.length} de {pedidos.length} pedidos</p>
        <div className="flex gap-4">
          <span>Total: <strong>
            R$ {pedidos.reduce((acc, p) => acc + p.valorTotal, 0).toLocaleString('pt-BR', {
              minimumFractionDigits: 2
            })}
          </strong></span>
        </div>
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
