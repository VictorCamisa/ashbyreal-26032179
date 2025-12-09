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
import { Search, Users, TrendingUp, UserPlus, Activity } from 'lucide-react';
import { useClientes } from '@/hooks/useClientes';
import { NovoClienteDialog } from '@/components/clientes/NovoClienteDialog';

const statusColors: Record<string, string> = {
  ativo: 'bg-primary/10 text-primary border-primary/20',
  inativo: 'bg-muted text-muted-foreground border-border',
  lead: 'bg-chart-4/10 text-chart-4 border-chart-4/20'
};

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { clientes, isLoading, createCliente, isCreating } = useClientes();

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

  const kpis = [
    { label: 'Total', value: stats.total, icon: Users },
    { label: 'Ativos', value: stats.ativos, icon: Activity },
    { label: 'Leads', value: stats.leads, icon: UserPlus },
    { label: 'Ticket Médio', value: `R$ ${stats.ticketMedio.toFixed(0)}`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">Clientes</h1>
            <p className="text-sm text-muted-foreground">Gerencie sua base de clientes</p>
          </div>
        </div>
        <NovoClienteDialog onSubmit={createCliente} isCreating={isCreating} />
      </header>

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="rounded-2xl border border-border/50 bg-card/50 p-4">
            <div className="flex items-center gap-2 mb-1">
              <kpi.icon className="h-3.5 w-3.5 text-primary opacity-70" />
              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                {kpi.label}
              </span>
            </div>
            <p className="text-2xl font-semibold">{kpi.value}</p>
          </div>
        ))}
      </section>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail ou telefone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11 h-11 rounded-xl bg-muted/30 border-border/50"
        />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-border/50 bg-card/50 overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/50 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-border/50">
                <TableHead className="font-medium">Nome</TableHead>
                <TableHead className="font-medium">Telefone</TableHead>
                <TableHead className="font-medium">E-mail</TableHead>
                <TableHead className="font-medium">Empresa</TableHead>
                <TableHead className="font-medium">Ticket Médio</TableHead>
                <TableHead className="font-medium">Status</TableHead>
                <TableHead className="font-medium">Origem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                    {searchTerm ? 'Nenhum cliente encontrado' : 'Adicione o primeiro cliente'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredClientes.map((cliente) => (
                  <TableRow
                    key={cliente.id}
                    className="cursor-pointer hover:bg-muted/30 border-border/30"
                    onClick={() => navigate(`/cliente/${cliente.id}`)}
                  >
                    <TableCell className="font-medium">{cliente.nome}</TableCell>
                    <TableCell className="text-muted-foreground">{cliente.telefone}</TableCell>
                    <TableCell className="text-muted-foreground">{cliente.email}</TableCell>
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
      </div>

      {filteredClientes.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {filteredClientes.length} de {clientes.length} clientes
        </p>
      )}
    </div>
  );
}