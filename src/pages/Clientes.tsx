import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Users, TrendingUp, Building2, ShoppingBag } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { NovoClienteDialog } from '@/components/clientes/NovoClienteDialog';
import { ImportarClientesDialog } from '@/components/clientes/ImportarClientesDialog';

import { PageLayout } from '@/components/layout/PageLayout';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { DataPagination } from '@/components/ui/data-pagination';

const segmentoColors: Record<string, string> = {
  B2B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  B2C: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
};

const ITEMS_PER_PAGE = 15;

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [segmentoFilter, setSegmentoFilter] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const { clientes, isLoading, createCliente, isCreating, bulkImportClientes, isImporting } = useClientes();

  const filteredClientes = useMemo(() =>
    clientes.filter(cliente =>
      (cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
       cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       cliente.telefone.includes(searchTerm)) &&
      (segmentoFilter === 'todos' || (cliente as any).segmento === segmentoFilter)
    ), [clientes, searchTerm, segmentoFilter]
  );

  useMemo(() => setCurrentPage(1), [searchTerm]);

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = {
    total: clientes.length,
    b2b: clientes.filter(c => (c as any).segmento === 'B2B').length,
    b2c: clientes.filter(c => (c as any).segmento === 'B2C').length,
    ticketMedio: clientes.length > 0
      ? clientes.reduce((acc, c) => acc + (c.ticketMedio || 0), 0) / clientes.length
      : 0,
  };

  return (
    <PageLayout
      title="Clientes"
      subtitle="Gerencie sua base de clientes"
      icon={Users}
      actions={
        <div className="flex items-center gap-2">
          <ImportarClientesDialog onImport={bulkImportClientes} isImporting={isImporting} />
          <NovoClienteDialog onSubmit={createCliente} isCreating={isCreating} />
        </div>
      }
    >
      <div className="space-y-6">
        <KPIGrid>
          <KPICard label="Total Compradores" value={stats.total} icon={Users} />
          <KPICard label="B2B (Lojistas)" value={stats.b2b} icon={Building2} variant="blue" />
          <KPICard label="B2C (Direto)" value={stats.b2c} icon={ShoppingBag} variant="success" />
          <KPICard label="Ticket Médio" value={`R$ ${stats.ticketMedio.toFixed(0)}`} icon={TrendingUp} />
        </KPIGrid>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, e-mail ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-11 h-11 rounded-xl"
            />
          </div>
          <div className="flex gap-1.5">
            {(['todos', 'B2B', 'B2C'] as const).map((s) => {
              const labels: Record<string, string> = { todos: 'Todos', B2B: 'B2B (Lojistas)', B2C: 'B2C (Direto)' };
              return (
                <Button
                  key={s}
                  variant={segmentoFilter === s ? 'default' : 'outline'}
                  size="sm"
                  className="h-11 rounded-xl text-xs"
                  onClick={() => setSegmentoFilter(s)}
                >
                  {labels[s]}
                </Button>
              );
            })}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[600px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium">Nome</TableHead>
                      <TableHead className="font-medium">Telefone</TableHead>
                      <TableHead className="font-medium">Empresa</TableHead>
                      <TableHead className="font-medium">Ticket Médio</TableHead>
                      <TableHead className="font-medium">Segmento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClientes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-muted-foreground">
                              {searchTerm ? 'Nenhum cliente encontrado' : 'Adicione o primeiro cliente'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedClientes.map((cliente) => (
                        <TableRow
                          key={cliente.id}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => navigate(`/cliente/${cliente.id}`)}
                        >
                          <TableCell className="font-medium">{cliente.nome}</TableCell>
                          <TableCell className="text-muted-foreground">{cliente.telefone}</TableCell>
                          <TableCell className="text-muted-foreground">{cliente.empresa || '-'}</TableCell>
                          <TableCell>R$ {(cliente.ticketMedio || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={segmentoColors[(cliente as any).segmento] || ''}>
                              {(cliente as any).segmento}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {filteredClientes.length > 0 && (
          <DataPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredClientes.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>

      
    </PageLayout>
  );
}
