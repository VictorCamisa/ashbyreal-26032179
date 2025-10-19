import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search } from 'lucide-react';
import { mockLeads } from '@/data/leads.mock';
import { PipelineColumn } from '@/types/lead';

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

  const filteredLeads = mockLeads.filter(lead =>
    lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.telefone.includes(searchTerm)
  );

  const getLeadsByStatus = (status: string) => {
    return filteredLeads.filter(lead => lead.status === status);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CRM Pipeline</h1>
          <p className="text-muted-foreground">Gestão de Leads e Oportunidades</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {pipelineColumns.map((column) => {
          const leads = getLeadsByStatus(column.id);
          return (
            <div key={column.id} className="space-y-3">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="font-semibold">{column.title}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {leads.length}
                </Badge>
              </div>
              <div className="space-y-2">
                {leads.map((lead) => (
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
                        <span className="text-xs font-semibold text-secondary">
                          R$ {lead.valorEstimado.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(lead.dataCriacao).toLocaleDateString('pt-BR')}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
