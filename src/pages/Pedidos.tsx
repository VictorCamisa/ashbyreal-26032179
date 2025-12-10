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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Beer, ShoppingCart, Eye, Filter } from 'lucide-react';
import { usePedidos } from '@/hooks/usePedidos';
import { NovoPedidoCompletoDialog } from '@/components/pedidos/NovoPedidoCompletoDialog';
import { VincularAshbyDialog } from '@/components/pedidos/VincularAshbyDialog';
import { PedidosKPIs } from '@/components/pedidos/PedidosKPIs';
import { PedidoStatusWorkflow } from '@/components/pedidos/PedidoStatusWorkflow';
import { supabase } from '@/integrations/supabase/client';
import { PageHeader } from '@/components/layout/PageHeader';

export default function Pedidos() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
      data.forEach((c) => (map[c.id] = c.nome));
      setClientesMap(map);
    }
  };

  const filteredPedidos = pedidos.filter((pedido) => {
    const matchesSearch =
      clientesMap[pedido.clienteId]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pedido.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleVincularAshby = (pedido: any) => {
    setSelectedPedido(pedido);
    setShowVincularAshby(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Pedidos & Vendas"
        subtitle="Gestão completa de vendas e entregas"
        icon={ShoppingCart}
        actions={<NovoPedidoCompletoDialog onSuccess={refetch} />}
      />

      {/* KPIs */}
      <PedidosKPIs pedidos={pedidos} />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por cliente ou número do pedido..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-11"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48 h-11">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Status</SelectItem>
            <SelectItem value="pendente">Pendente</SelectItem>
            <SelectItem value="pago">Pago</SelectItem>
            <SelectItem value="entregue">Entregue</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-medium">Lista de Pedidos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="font-medium">Pedido</TableHead>
                  <TableHead className="font-medium">Cliente</TableHead>
                  <TableHead className="font-medium">Valor</TableHead>
                  <TableHead className="font-medium">Data</TableHead>
                  <TableHead className="font-medium">Status / Ações</TableHead>
                  <TableHead className="font-medium text-right">Mais</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPedidos.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-12 text-muted-foreground"
                    >
                      Nenhum pedido encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPedidos.map((pedido) => (
                    <TableRow key={pedido.id} className="hover:bg-muted/30">
                      <TableCell className="font-mono text-sm">
                        #{pedido.id.slice(0, 8)}
                      </TableCell>
                      <TableCell className="font-medium">
                        {clientesMap[pedido.clienteId] || '-'}
                      </TableCell>
                      <TableCell className="font-semibold text-primary">
                        R${' '}
                        {pedido.valorTotal.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                        })}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}
                      </TableCell>
                      <TableCell>
                        <PedidoStatusWorkflow
                          pedidoId={pedido.id}
                          currentStatus={pedido.status}
                          onStatusChange={refetch}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            title="Ver detalhes"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleVincularAshby(pedido)}
                            className="h-8 w-8"
                            title="Vincular Ashby"
                          >
                            <Beer className="h-4 w-4" />
                          </Button>
                        </div>
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
          Total:{' '}
          R${' '}
          {filteredPedidos
            .reduce((acc, p) => acc + p.valorTotal, 0)
            .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
