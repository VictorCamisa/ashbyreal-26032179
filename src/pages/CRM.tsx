import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, Target, DollarSign } from 'lucide-react';
import { useLeads } from '@/hooks/useLeads';
import { NovoLeadDialog } from '@/components/crm/NovoLeadDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PipelineColumn } from '@/types/lead';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const { leads, isLoading, createLead, isCreating, updateLeadStatus } = useLeads();

  const filteredLeads = leads.filter(lead =>
    lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.telefone.includes(searchTerm)
  );

  const getLeadsByStatus = (status: string) => {
    return filteredLeads.filter(lead => lead.status === status);
  };

  const handleStatusChange = async (leadId: string, newStatus: string) => {
    await updateLeadStatus(leadId, newStatus);
  };

  const stats = {
    total: leads.length,
    valorTotal: leads.reduce((acc, lead) => acc + lead.valorEstimado, 0),
    taxaConversao: leads.length > 0 
      ? (leads.filter(l => l.status === 'fechado').length / leads.length) * 100 
      : 0,
    emNegociacao: leads.filter(l => l.status === 'negociacao').length,
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
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.taxaConversao.toFixed(1)}%
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Em Negociação</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.emNegociacao}</div>
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
          {[...Array(5)].map((_, i) => (
            <div key={i} className="space-y-3">
              <Skeleton className="h-12 w-full" />
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
                  <h3 className="font-semibold">{column.title}</h3>
                  <Badge variant="secondary" className="ml-auto">
                    {columnLeads.length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {columnLeads.length === 0 ? (
                    <Card className="p-4">
                      <p className="text-xs text-muted-foreground text-center">
                        Nenhum lead nesta etapa
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
                          <CardTitle className="text-sm">{lead.nome}</CardTitle>
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
                          <Select
                            value={lead.status}
                            onValueChange={(value) => handleStatusChange(lead.id, value)}
                          >
                            <SelectTrigger 
                              className="h-7 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {pipelineColumns.map((col) => (
                                <SelectItem key={col.id} value={col.id} className="text-xs">
                                  {col.title}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
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
