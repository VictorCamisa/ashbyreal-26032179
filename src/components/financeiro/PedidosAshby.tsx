import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Beer } from 'lucide-react';
import { useAshby } from '@/hooks/useAshby';
import { useAshbyMutations } from '@/hooks/useAshbyMutations';
import { Badge } from '@/components/ui/badge';
import { NovoPedidoAshbyDialog } from './NovoPedidoAshbyDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export function PedidosAshby() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [quarter, setQuarter] = useState(Math.ceil((new Date().getMonth() + 1) / 3));
  const [showNovoPedido, setShowNovoPedido] = useState(false);
  
  const { pedidos, isLoading } = useAshby(year, quarter);
  const { createPedido, isCreating } = useAshbyMutations();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Beer className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Pedidos Ashby</h2>
            <p className="text-sm text-muted-foreground">Controle de pedidos de chopp</p>
          </div>
        </div>
        <Button onClick={() => setShowNovoPedido(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Novo Pedido
        </Button>
      </div>

      <div className="flex gap-4">
        <select
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          className="px-3 py-2 border rounded-md bg-background"
        >
          {[2024, 2025, 2026].map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={quarter}
          onChange={(e) => setQuarter(Number(e.target.value))}
          className="px-3 py-2 border rounded-md bg-background"
        >
          <option value={1}>1º Trimestre</option>
          <option value={2}>2º Trimestre</option>
          <option value={3}>3º Trimestre</option>
          <option value={4}>4º Trimestre</option>
        </select>
      </div>

      {pedidos && pedidos.length > 0 ? (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Litros</TableHead>
                  <TableHead>Valor s/ NF</TableHead>
                  <TableHead>Valor c/ NF</TableHead>
                  <TableHead>Frete</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidos.map((pedido) => (
                  <TableRow key={pedido.id}>
                    <TableCell className="font-medium">
                      {new Date(pedido.order_date).toLocaleDateString('pt-BR')}
                    </TableCell>
                    <TableCell>{pedido.liters ? `${pedido.liters}L` : '-'}</TableCell>
                    <TableCell>
                      R$ {pedido.value_sem_nf?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </TableCell>
                    <TableCell>
                      R$ {pedido.value_com_nf?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </TableCell>
                    <TableCell>
                      R$ {pedido.freight?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      R$ {pedido.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge variant={
                        pedido.status === 'PAGO' ? 'default' : 
                        pedido.status === 'PREVISTO' ? 'secondary' : 
                        'destructive'
                      }>
                        {pedido.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum pedido encontrado para este período.</p>
          </CardContent>
        </Card>
      )}

      <NovoPedidoAshbyDialog
        open={showNovoPedido}
        onOpenChange={setShowNovoPedido}
        onSave={(order) => {
          createPedido(order);
          setShowNovoPedido(false);
        }}
        isLoading={isCreating}
      />
    </div>
  );
}
