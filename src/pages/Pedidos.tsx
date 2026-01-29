import { useState, useEffect, useMemo } from 'react';
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
import { Search, ShoppingCart, Eye, Filter, BarChart3, List } from 'lucide-react';
import { usePedidos } from '@/hooks/usePedidos';
import { NovoPedidoCompletoDialog } from '@/components/pedidos/NovoPedidoCompletoDialog';
import { EscanearPedidoDialog } from '@/components/pedidos/EscanearPedidoDialog';
import { DetalhesPedidoDrawer } from '@/components/pedidos/DetalhesPedidoDrawer';
import { PedidosKPIs } from '@/components/pedidos/PedidosKPIs';
import { PedidoStatusWorkflow } from '@/components/pedidos/PedidoStatusWorkflow';
import { VendasPeriodoChart } from '@/components/pedidos/VendasPeriodoChart';
import { VendasCategoriaChart } from '@/components/pedidos/VendasCategoriaChart';
import { RankingClientes } from '@/components/pedidos/RankingClientes';
import { TopProdutos } from '@/components/pedidos/TopProdutos';
import { supabase } from '@/integrations/supabase/client';
import { PageLayout } from '@/components/layout/PageLayout';
import { DataPagination } from '@/components/ui/data-pagination';
import { cn } from '@/lib/utils';

interface PedidoItemWithProduto {
  id: string;
  produtoId: string;
  quantidade: number;
  subtotal: number;
  precoUnitario: number;
  produto?: {
    nome?: string;
    categoria?: string;
  };
}

const tabs = [
  { id: 'lista', label: 'Lista de Pedidos', icon: List },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
];

const ITEMS_PER_PAGE = 15;

export default function Pedidos() {
  const [activeTab, setActiveTab] = useState('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientesMap, setClientesMap] = useState<Record<string, string>>({});
  const [allItems, setAllItems] = useState<PedidoItemWithProduto[]>([]);
  const [selectedPedido, setSelectedPedido] = useState<any>(null);
  const [showDetalhes, setShowDetalhes] = useState(false);
  const [detalhesPedidoId, setDetalhesPedidoId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { pedidos, isLoading, refetch } = usePedidos();

  useEffect(() => {
    fetchClientes();
    fetchAllItems();
  }, []);

  const fetchClientes = async () => {
    const { data } = await supabase.from('clientes').select('id, nome');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((c) => (map[c.id] = c.nome));
      setClientesMap(map);
    }
  };

  const fetchAllItems = async () => {
    const { data } = await supabase
      .from('pedido_itens')
      .select(`
        id,
        produto_id,
        quantidade,
        subtotal,
        preco_unitario,
        produtos (nome, categoria)
      `);

    if (data) {
      setAllItems(
        data.map((item: any) => ({
          id: item.id,
          produtoId: item.produto_id,
          quantidade: item.quantidade,
          subtotal: Number(item.subtotal),
          precoUnitario: Number(item.preco_unitario),
          produto: item.produtos
            ? { nome: item.produtos.nome, categoria: item.produtos.categoria }
            : undefined,
        }))
      );
    }
  };

  const filteredPedidos = useMemo(() => pedidos.filter((pedido) => {
    const matchesSearch =
      clientesMap[pedido.clienteId]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pedido.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || pedido.status === statusFilter;
    return matchesSearch && matchesStatus;
  }), [pedidos, clientesMap, searchTerm, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => setCurrentPage(1), [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredPedidos.length / ITEMS_PER_PAGE);
  const paginatedPedidos = filteredPedidos.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleViewDetails = (pedido: any) => {
    setDetalhesPedidoId(pedido.id);
    setSelectedPedido(pedido);
    setShowDetalhes(true);
  };

  return (
    <PageLayout
      title="Pedidos & Vendas"
      subtitle="Gestão completa de vendas e entregas"
      icon={ShoppingCart}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={
        <div className="flex gap-2">
          <EscanearPedidoDialog onSuccess={() => { refetch(); fetchAllItems(); }} />
          <NovoPedidoCompletoDialog onSuccess={() => { refetch(); fetchAllItems(); }} />
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPIs */}
        <PedidosKPIs pedidos={pedidos} />

        {activeTab === 'lista' && (
          <>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente ou número do pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-11 h-11 rounded-xl"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48 h-11 rounded-xl">
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
            <Card className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Lista de Pedidos</CardTitle>
              </CardHeader>
              <CardContent className="p-0 overflow-x-auto">
                {isLoading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="h-14 bg-muted/50 rounded-lg animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <Table className="min-w-[700px]">
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
                      {paginatedPedidos.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
                              <p className="text-muted-foreground">Nenhum pedido encontrado</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedPedidos.map((pedido) => (
                          <TableRow
                            key={pedido.id}
                            className="hover:bg-muted/30 cursor-pointer"
                            onClick={() => handleViewDetails(pedido)}
                            title={`ID: ${pedido.id}`}
                          >
                            <TableCell className="font-mono text-sm">
                              <span title={pedido.id}>#{pedido.id.slice(0, 8)}</span>
                            </TableCell>
                            <TableCell className="font-medium max-w-[150px] truncate">
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
                            <TableCell onClick={(e) => e.stopPropagation()}>
                              <PedidoStatusWorkflow
                                pedidoId={pedido.id}
                                currentStatus={pedido.status}
                                onStatusChange={refetch}
                              />
                            </TableCell>
                            <TableCell
                              className="text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                title="Ver detalhes"
                                onClick={() => handleViewDetails(pedido)}
                              >
                                <Eye className="h-4 w-4" />
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-sm">
              <DataPagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={filteredPedidos.length}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
              />
              <p className="font-medium">
                Total: R${' '}
                {filteredPedidos
                  .reduce((acc, p) => acc + p.valorTotal, 0)
                  .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <VendasPeriodoChart pedidos={pedidos} />
              <VendasCategoriaChart items={allItems} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <RankingClientes pedidos={pedidos} clientesMap={clientesMap} />
              <TopProdutos items={allItems} />
            </div>
          </div>
        )}
      </div>

      {/* Drawers & Dialogs */}
      <DetalhesPedidoDrawer
        open={showDetalhes}
        onOpenChange={setShowDetalhes}
        pedidoId={detalhesPedidoId}
        clienteNome={selectedPedido ? clientesMap[selectedPedido.clienteId] : undefined}
        onStatusChange={refetch}
        onDelete={refetch}
      />
    </PageLayout>
  );
}
