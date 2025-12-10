import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, TrendingUp, UserCheck, DollarSign, Users } from 'lucide-react';
import { PipelineColumn } from '@/types/lead';
import { useLeads } from '@/hooks/useLeads';
import { NovoLeadDialog } from '@/components/crm/NovoLeadDialog';
import { PageHeader } from '@/components/layout/PageHeader';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Lead } from '@/types/lead';

const pipelineColumns: PipelineColumn[] = [
  { id: 'novo_lead', title: 'Novo', color: 'bg-blue-500' },
  { id: 'qualificado', title: 'Qualificado', color: 'bg-amber-500' },
  { id: 'negociacao', title: 'Negociação', color: 'bg-violet-500' },
  { id: 'fechado', title: 'Fechado', color: 'bg-emerald-500' },
  { id: 'perdido', title: 'Perdido', color: 'bg-red-500' },
];

const origemColors: Record<string, string> = {
  WhatsApp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Facebook: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Indicação: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Site: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Outros: 'bg-muted text-muted-foreground'
};

function DraggableLeadCard({ lead, navigate }: { lead: Lead; navigate: (path: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 rounded-lg bg-card border border-border/50 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all hover:shadow-sm"
      onClick={() => navigate(`/cliente/${lead.id}`)}
    >
      <p className="text-sm font-medium mb-1">{lead.nome}</p>
      <p className="text-xs text-muted-foreground mb-2">{lead.telefone}</p>
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={`text-[10px] ${origemColors[lead.origem]}`}>
          {lead.origem}
        </Badge>
        <span className="text-xs font-medium">
          R$ {lead.valorEstimado.toLocaleString('pt-BR')}
        </span>
      </div>
    </div>
  );
}

function DroppableColumn({ column, children }: { column: PipelineColumn; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });

  return (
    <div 
      ref={setNodeRef} 
      className={`space-y-2 min-h-[150px] p-2 rounded-lg transition-colors ${isOver ? 'bg-primary/5' : ''}`}
    >
      {children}
    </div>
  );
}

export default function CRM() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { leads, isLoading, createLead, isCreating, updateLeadStatus } = useLeads();

  const filteredLeads = leads.filter(lead =>
    lead.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.telefone.includes(searchTerm)
  );

  const getLeadsByStatus = (status: string) => filteredLeads.filter(lead => lead.status === status);

  const stats = {
    total: leads.length,
    qualificados: leads.filter(l => l.status === 'qualificado').length,
    fechados: leads.filter(l => l.status === 'fechado').length,
    valorTotal: leads.filter(l => l.status === 'fechado').reduce((acc, l) => acc + l.valorEstimado, 0),
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    await updateLeadStatus(active.id as string, over.id as string);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="CRM Pipeline"
        subtitle="Gestão de leads e oportunidades"
        icon={TrendingUp}
        actions={
          <NovoLeadDialog onSubmit={createLead} isCreating={isCreating} />
        }
      />

      {/* KPIs */}
      <KPIGrid>
        <KPICard label="Total Leads" value={stats.total} icon={Users} />
        <KPICard label="Qualificados" value={stats.qualificados} icon={UserCheck} variant="warning" />
        <KPICard label="Fechados" value={stats.fechados} icon={TrendingUp} variant="success" />
        <KPICard 
          label="Valor Total" 
          value={`R$ ${(stats.valorTotal / 1000).toFixed(0)}k`} 
          icon={DollarSign} 
        />
      </KPIGrid>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11 h-11"
        />
      </div>

      {/* Pipeline */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {pipelineColumns.map((col) => (
            <div key={col.id} className="space-y-3">
              <div className="h-6 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-muted rounded-lg animate-pulse" />
              <div className="h-24 bg-muted rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {pipelineColumns.map((column) => {
              const columnLeads = getLeadsByStatus(column.id);
              return (
                <Card key={column.id} className="bg-muted/30">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <div className={`w-2 h-2 rounded-full ${column.color}`} />
                      <span className="text-xs font-medium">{column.title}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{columnLeads.length}</span>
                    </div>
                    <DroppableColumn column={column}>
                      {columnLeads.length === 0 ? (
                        <div className="p-4 text-center text-xs text-muted-foreground">
                          Nenhum lead
                        </div>
                      ) : (
                        columnLeads.map((lead) => (
                          <DraggableLeadCard key={lead.id} lead={lead} navigate={navigate} />
                        ))
                      )}
                    </DroppableColumn>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
}
