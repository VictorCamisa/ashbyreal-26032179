import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Search, Users, TrendingUp, UserPlus, Activity, Download } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { NovoClienteDialog } from '@/components/clientes/NovoClienteDialog';
import { ImportarClientesDialog } from '@/components/clientes/ImportarClientesDialog';
import { ExtrairLeadsDialog } from '@/components/clientes/ExtrairLeadsDialog';
import { PageLayout } from '@/components/layout/PageLayout';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';

const statusColors: Record<string, string> = {
  ativo: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  inativo: 'bg-muted text-muted-foreground border-border',
  lead: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800'
};

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const [showExtrairLeads, setShowExtrairLeads] = useState(false);
  const navigate = useNavigate();
  const { clientes, isLoading, createCliente, isCreating, bulkImportClientes, isImporting } = useClientes();

  const filteredClientes = clientes.filter(cliente =>
    cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.telefone.includes(searchTerm)
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
      subtitle="Gerencie sua base de clientes"
      icon={Users}
      actions={
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
      }
    >
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
              <Table>
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
                    filteredClientes.map((cliente) => (
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
            )}
          </CardContent>
        </Card>

        {filteredClientes.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {filteredClientes.length} de {clientes.length} clientes
          </p>
        )}
      </div>

      <ExtrairLeadsDialog 
        open={showExtrairLeads} 
        onOpenChange={setShowExtrairLeads} 
      />
    </PageLayout>
  );
}
