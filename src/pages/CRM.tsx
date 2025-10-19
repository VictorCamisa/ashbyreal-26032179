import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, UserCheck, DollarSign, Users } from 'lucide-react';
import { PipelineColumn } from '@/types/lead';
import { useLeads } from '@/hooks/useLeads';
import { NovoLeadDialog } from '@/components/crm/NovoLeadDialog';
import { Skeleton } from '@/components/ui/skeleton';

const pipelineColumns: PipelineColumn[] = [
  { id: 'novo_lead', title: 'Novo Lead', color: 'bg-blue-500' },
  { id: 'qualificado', title: 'Qualificado', color: 'bg-yellow-500' },
  { id: 'negociacao', title: 'Em Negociação', color: 'bg-orange-500' },
  { id: 'fechado', title: 'Fechado', color: 'bg-green-500' },
  { id: 'perdido', title: 'Perdido', color: 'bg-red-500' },
];

const origemColors: Record<string, string> = {
  WhatsApp: 'bg-green-500',
  Instagram: 'bg-purple-500',
  Facebook: 'bg-blue-500',
  Indicação: 'bg-yellow-500',
  Site: 'bg-cyan-500',
  Outros: 'bg-gray-500'
};

export default function CRM() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { leads, isLoading, createLead, isCreating } = useLeads();

  const filteredLeads = leads.filter(lead =>
    lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.telefone.includes(searchTerm)
  );

  const getLeadsByStatus = (status: string) => {
    return filteredLeads.filter(lead => lead.status === status);
  };

  const stats = {
    total: leads.length,
    qualificados: leads.filter(l => l.status === 'qualificado').length,
    fechados: leads.filter(l => l.status === 'fechado').length,
    valorTotal: leads
      .filter(l => l.status === 'fechado')
      .reduce((acc, l) => acc + l.valorEstimado, 0),
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">CRM Pipeline</h1>
          <p className="text-muted-foreground">Gestão de Leads e Oportunidades</p>
        </div>
        <NovoLeadDialog onSubmit={createLead} isCreating={isCreating} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.qualificados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fechados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.fechados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {pipelineColumns.map((column) => (
            <div key={column.id} className="space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {pipelineColumns.map((column) => {
            const columnLeads = getLeadsByStatus(column.id);
            return (
              <div key={column.id} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${column.color}`} />
                  <h3 className="font-semibold text-sm">{column.title}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {columnLeads.length}
                  </Badge>
                </div>
                <div className="space-y-2 min-h-[200px]">
                  {columnLeads.length === 0 ? (
                    <Card className="p-4">
                      <p className="text-sm text-muted-foreground text-center">
                        Nenhum lead
                      </p>
                    </Card>
                  ) : (
                    columnLeads.map((lead) => (
                      <Card 
                        key={lead.id} 
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => navigate(`/cliente/${lead.id}`)}
                      >
                        <CardHeader className="p-4 pb-2">
                          <CardTitle className="text-sm font-medium">{lead.nome}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 pt-0 space-y-2">
                          <p className="text-xs text-muted-foreground">{lead.telefone}</p>
                          <div className="flex items-center justify-between">
                            <Badge className={`${origemColors[lead.origem]} text-xs`}>
                              {lead.origem}
                            </Badge>
                            <span className="text-xs font-semibold">
                              R$ {lead.valorEstimado.toLocaleString('pt-BR')}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {new Date(lead.dataCriacao).toLocaleDateString('pt-BR')}
                          </p>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
