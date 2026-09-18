import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle, Building2, Search, ShoppingBag, TrendingUp, Users } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { useClientesUnificados, type ContraparteUnificada } from '@/hooks/useClientesUnificados';
import { NovoClienteDialog } from '@/components/clientes/NovoClienteDialog';
import { ImportarClientesDialog } from '@/components/clientes/ImportarClientesDialog';
import { PageLayout } from '@/components/layout/PageLayout';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { DataPagination } from '@/components/ui/data-pagination';
import { cn } from '@/lib/utils';

const segmentoColors: Record<string, string> = {
  B2B: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  B2C: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  indefinido: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
};

const ITEMS_PER_PAGE = 15;

const moeda = (valor: number) =>
  valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

type Filtro = 'todos' | 'B2B' | 'B2C' | 'revisao';

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filtro, setFiltro] = useState<Filtro>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();

  // Listagem vem do cruzamento com os pedidos; as mutações continuam na tabela.
  const { contrapartes, isLoading } = useClientesUnificados();
  const { createCliente, isCreating, bulkImportClientes, isImporting } = useClientes();

  const filtradas = useMemo(() => {
    const busca = searchTerm.trim().toLowerCase();
    return contrapartes.filter((c) => {
      const casaBusca =
        busca === '' ||
        c.nome?.toLowerCase().includes(busca) ||
        c.empresa?.toLowerCase().includes(busca) ||
        c.email?.toLowerCase().includes(busca) ||
        c.telefone?.includes(busca) ||
        c.cidade?.toLowerCase().includes(busca);

      const casaFiltro =
        filtro === 'todos' ||
        (filtro === 'revisao' ? c.precisa_revisao : c.segmento === filtro);

      return casaBusca && casaFiltro;
    });
  }, [contrapartes, searchTerm, filtro]);

  const paginaAtual = Math.min(currentPage, Math.max(1, Math.ceil(filtradas.length / ITEMS_PER_PAGE)));
  const totalPages = Math.ceil(filtradas.length / ITEMS_PER_PAGE);
  const paginadas = filtradas.slice((paginaAtual - 1) * ITEMS_PER_PAGE, paginaAtual * ITEMS_PER_PAGE);

  const stats = useMemo(() => {
    const faturamento = contrapartes.reduce((acc, c) => acc + c.faturamento, 0);
    const pedidos = contrapartes.reduce((acc, c) => acc + c.pedidos, 0);
    return {
      total: contrapartes.length,
      b2b: contrapartes.filter((c) => c.segmento === 'B2B').length,
      b2c: contrapartes.filter((c) => c.segmento === 'B2C').length,
      revisao: contrapartes.filter((c) => c.precisa_revisao).length,
      ticketMedio: pedidos > 0 ? faturamento / pedidos : 0,
    };
  }, [contrapartes]);

  const abrir = (c: ContraparteUnificada) =>
    navigate(c.tipo_cadastro === 'lojista' ? `/lojistas/${c.id}` : `/clientes/${c.id}`);

  const filtros: { chave: Filtro; label: string }[] = [
    { chave: 'todos', label: 'Todos' },
    { chave: 'B2B', label: 'B2B (Lojistas)' },
    { chave: 'B2C', label: 'B2C (Direto)' },
    { chave: 'revisao', label: `Revisar${stats.revisao ? ` (${stats.revisao})` : ''}` },
  ];

  return (
    <PageLayout
      title="Clientes"
      subtitle="Quem compra de você — clientes diretos e lojistas, consolidados a partir dos pedidos"
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
          <KPICard label="Compradores" value={stats.total} icon={Users} />
          <KPICard label="B2B (Lojistas)" value={stats.b2b} icon={Building2} variant="blue" />
          <KPICard label="B2C (Direto)" value={stats.b2c} icon={ShoppingBag} variant="success" />
          <KPICard label="Ticket Médio" value={moeda(stats.ticketMedio)} icon={TrendingUp} />
        </KPIGrid>

        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, empresa, telefone ou cidade..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="h-11 rounded-xl pl-11"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
            {filtros.map(({ chave, label }) => (
              <Button
                key={chave}
                variant={filtro === chave ? 'default' : 'outline'}
                size="sm"
                className={cn(
                  'h-11 shrink-0 rounded-xl text-xs',
                  chave === 'revisao' && filtro !== chave && stats.revisao > 0 && 'border-warning/40 text-warning',
                )}
                onClick={() => { setFiltro(chave); setCurrentPage(1); }}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="space-y-3 p-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/50" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table className="min-w-[720px]">
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="font-medium">Nome</TableHead>
                      <TableHead className="font-medium">Contato</TableHead>
                      <TableHead className="font-medium text-right">Pedidos</TableHead>
                      <TableHead className="font-medium text-right">Faturamento</TableHead>
                      <TableHead className="font-medium text-right">Último</TableHead>
                      <TableHead className="font-medium">Segmento</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginadas.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-12 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Users className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-muted-foreground">
                              {searchTerm || filtro !== 'todos'
                                ? 'Nenhum comprador encontrado com esse filtro'
                                : 'Nenhum pedido registrado ainda'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginadas.map((c) => (
                        <TableRow
                          key={`${c.tipo_cadastro}-${c.id}`}
                          className="cursor-pointer hover:bg-muted/30"
                          onClick={() => abrir(c)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{c.nome}</span>
                              {c.precisa_revisao && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-warning" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <ul className="space-y-0.5 text-xs">
                                      {c.pendencias.map((p) => <li key={p}>• {p}</li>)}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                            {(c.empresa || c.cidade) && (
                              <p className="text-xs text-muted-foreground">
                                {[c.empresa, c.cidade].filter(Boolean).join(' · ')}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {c.telefone ?? <span className="italic opacity-60">sem telefone</span>}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">
                            {c.pedidos}
                            {c.pedidos_pendentes > 0 && (
                              <span className="ml-1 text-xs text-warning">({c.pedidos_pendentes} pend.)</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{moeda(c.faturamento)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground tabular-nums">
                            {c.dias_sem_comprar === null
                              ? '—'
                              : c.dias_sem_comprar === 0
                                ? 'hoje'
                                : `${c.dias_sem_comprar}d`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={segmentoColors[c.segmento] ?? ''}>
                              {c.segmento}
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

        {filtradas.length > 0 && (
          <DataPagination
            currentPage={paginaAtual}
            totalPages={totalPages}
            totalItems={filtradas.length}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </PageLayout>
  );
}
