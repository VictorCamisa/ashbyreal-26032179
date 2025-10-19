import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search } from 'lucide-react';
import { mockPedidos } from '@/data/pedidos.mock';

const statusColors = {
  pendente: 'bg-yellow-500',
  pago: 'bg-green-500',
  entregue: 'bg-blue-500',
  cancelado: 'bg-red-500'
};

export default function Pedidos() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPedidos = mockPedidos.filter(pedido =>
    pedido.nomeCliente.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pedido.id.includes(searchTerm)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">Gestão de Vendas Manuais</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido
        </Button>
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

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Itens</TableHead>
              <TableHead>Valor Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pagamento</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPedidos.map((pedido) => (
              <TableRow key={pedido.id}>
                <TableCell className="font-medium">#{pedido.id}</TableCell>
                <TableCell>{pedido.nomeCliente}</TableCell>
                <TableCell>{pedido.items.length} item(s)</TableCell>
                <TableCell className="font-bold text-secondary">
                  R$ {pedido.valorTotal.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2
                  })}
                </TableCell>
                <TableCell>
                  <Badge className={statusColors[pedido.status]}>
                    {pedido.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {pedido.metodoPagamento ? (
                    <Badge variant="outline">{pedido.metodoPagamento}</Badge>
                  ) : '-'}
                </TableCell>
                <TableCell>
                  {new Date(pedido.dataPedido).toLocaleDateString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <p>Mostrando {filteredPedidos.length} de {mockPedidos.length} pedidos</p>
        <div className="flex gap-4">
          <span>Total: <strong className="text-secondary">
            R$ {mockPedidos.reduce((acc, p) => acc + p.valorTotal, 0).toLocaleString('pt-BR')}
          </strong></span>
        </div>
      </div>
    </div>
  );
}
