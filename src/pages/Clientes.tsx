import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, Users, TrendingUp, UserPlus, Activity, Download, Store } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { NovoClienteDialog } from '@/components/clientes/NovoClienteDialog';
import { ImportarClientesDialog } from '@/components/clientes/ImportarClientesDialog';
import { ExtrairLeadsDialog } from '@/components/clientes/ExtrairLeadsDialog';
import { LojistasTab } from '@/components/lojistas/LojistasTab';
import { PageLayout } from '@/components/layout/PageLayout';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { DataPagination } from '@/components/ui/data-pagination';

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  inativo: 'bg-muted text-muted-foreground border-border',
  lead: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
};

const ITEMS_PER_PAGE = 15;

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showExtrairLeads, setShowExtrairLeads] = useState(false);
  const [mainTab, setMainTab] = useState<'clientes' | 'lojistas'>('clientes');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'ativo' | 'lead' | 'inativo'>('todos');
  const [currentPage, setCurrentPage] = useState(1);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clientes, isLoading, createCliente, isCreating, bulkImportClientes, isImporting } = useClientes();

  // Handle ?tab=leads query param
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'leads') {
      setStatusFilter('lead');
    }
  }, [searchParams]);

  const filteredClientes = useMemo(() => 
    clientes.filter(cliente =>
      (cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
       cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
       cliente.telefone.includes(searchTerm)) &&
      (statusFilter === 'todos' || cliente.status === statusFilter)
    ), [clientes, searchTerm, statusFilter]
  );

  // Reset to page 1 when search changes
  useMemo(() => setCurrentPage(1), [searchTerm]);

  const totalPages = Math.ceil(filteredClientes.length / ITEMS_PER_PAGE);
  const paginatedClientes = filteredClientes.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const stats = {
    total: clientes.length,
    ativos: clientes.filter(c => c.status === 'ativo').length,
    leads: clientes.filter(c => c.status === 'lead').length,
    ticketMedio: clientes.length > 0 
      ? clientes.reduce((acc, c) => acc + (c.ticketMedio || 0), 0) / clientes.length 
      : 0,
  };

  return (
    <PageLayout
      title="Clientes"
      subtitle="Gerencie sua base de clientes e lojistas"
      icon={Users}
      actions={
        mainTab === 'clientes' ? (
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowExtrairLeads(true)}
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Extrair Leads
            </Button>
            <ImportarClientesDialog onImport={bulkImportClientes} isImporting={isImporting} />
            <NovoClienteDialog onSubmit={createCliente} isCreating={isCreating} />
          </div>
        ) : null
      }
    >
      <Tabs value={mainTab} onValueChange={(v) => setMainTab(v as 'clientes' | 'lojistas')} className="space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="grid w-full min-w-[280px] max-w-md grid-cols-2">
            <TabsTrigger value="clientes" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="lojistas" className="gap-1.5 sm:gap-2 text-xs sm:text-sm">
              <Store className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              Lojistas
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="clientes">
          <div className="space-y-6">
            {/* KPIs */}
            <KPIGrid>
              <KPICard label="Total" value={stats.total} icon={Users} />
              <KPICard label="Ativos" value={stats.ativos} icon={Activity} variant="success" />
              <KPICard label="Leads" value={stats.leads} icon={UserPlus} variant="warning" />
              <KPICard 
                label="Ticket Médio" 
                value={`R$ ${stats.ticketMedio.toFixed(0)}`} 
                icon={TrendingUp} 
              />
            </KPIGrid>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, e-mail ou telefone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 rounded-xl"
              />
            </div>

            {/* Table */}
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
                        <TableHead className="font-medium">Status</TableHead>
                        <TableHead className="font-medium">Origem</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredClientes.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
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
                              <Badge variant="outline" className={statusColors[cliente.status]}>
                                {cliente.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{cliente.origem}</TableCell>
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
        </TabsContent>

        <TabsContent value="lojistas">
          <LojistasTab />
        </TabsContent>
      </Tabs>

      <ExtrairLeadsDialog 
        open={showExtrairLeads} 
        onOpenChange={setShowExtrairLeads} 
      />
    </PageLayout>
  );
}
