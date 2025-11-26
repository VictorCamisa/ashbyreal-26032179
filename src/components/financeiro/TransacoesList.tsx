import { Card, CardContent } from '@/components/ui/card';
import { useTransacoes } from '@/hooks/useTransacoes';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface TransacoesListProps {
  entityType: 'LOJA' | 'PARTICULAR';
  tipo: 'PAGAR' | 'RECEBER';
}

export function TransacoesList({ entityType, tipo }: TransacoesListProps) {
  const { transacoes, isLoading } = useTransacoes(entityType, tipo);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data Venc.</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transacoes?.map((transacao) => (
              <TableRow key={transacao.id}>
                <TableCell>
                  {new Date(transacao.due_date).toLocaleDateString('pt-BR')}
                </TableCell>
                <TableCell>{transacao.description}</TableCell>
                <TableCell>{transacao.category_id}</TableCell>
                <TableCell className="font-semibold">
                  R$ {transacao.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </TableCell>
                <TableCell>
                  <Badge variant={
                    transacao.status === 'PAGO' ? 'default' : 
                    transacao.status === 'PREVISTO' ? 'secondary' : 
                    transacao.status === 'ATRASADO' ? 'destructive' :
                    'outline'
                  }>
                    {transacao.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {/* Ações aqui */}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
