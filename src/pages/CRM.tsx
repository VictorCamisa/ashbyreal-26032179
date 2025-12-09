import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Search, TrendingUp, UserCheck, DollarSign, Users } from 'lucide-react';
import { PipelineColumn } from '@/types/lead';
import { useLeads } from '@/hooks/useLeads';
import { NovoLeadDialog } from '@/components/crm/NovoLeadDialog';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Lead } from '@/types/lead';

const pipelineColumns: PipelineColumn[] = [
  { id: 'novo_lead', title: 'Novo', color: 'bg-chart-2' },
  { id: 'qualificado', title: 'Qualificado', color: 'bg-chart-4' },
  { id: 'negociacao', title: 'Negociação', color: 'bg-chart-5' },
  { id: 'fechado', title: 'Fechado', color: 'bg-primary' },
  { id: 'perdido', title: 'Perdido', color: 'bg-destructive' },
];

const origemColors: Record<string, string> = {
  WhatsApp: 'bg-primary/10 text-primary',
  Instagram: 'bg-chart-3/10 text-chart-3',
  Facebook: 'bg-chart-2/10 text-chart-2',
  Indicação: 'bg-chart-4/10 text-chart-4',
  Site: 'bg-chart-5/10 text-chart-5',
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
      className="p-3 rounded-xl bg-card border border-border/50 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all"
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
      className={`space-y-2 min-h-[150px] p-2 rounded-xl transition-colors ${isOver ? 'bg-primary/5' : ''}`}
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

  const kpis = [
    { label: 'Total', value: stats.total, icon: Users },
    { label: 'Qualificados', value: stats.qualificados, icon: UserCheck },
    { label: 'Fechados', value: stats.fechados, icon: TrendingUp },
    { label: 'Valor', value: `R$ ${(stats.valorTotal / 1000).toFixed(0)}k`, icon: DollarSign },
  ];

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    await updateLeadStatus(active.id as string, over.id as string);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold">CRM Pipeline</h1>
            <p className="text-sm text-muted-foreground">Gestão de leads</p>
          </div>
        </div>
        <NovoLeadDialog onSubmit={createLead} isCreating={isCreating} />
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
          placeholder="Buscar leads..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-11 h-11 rounded-xl bg-muted/30 border-border/50"
        />
      </div>

      {/* Pipeline */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {pipelineColumns.map((col) => (
            <div key={col.id} className="space-y-3">
              <div className="h-6 bg-muted rounded animate-pulse" />
              <div className="h-24 bg-muted rounded-xl animate-pulse" />
              <div className="h-24 bg-muted rounded-xl animate-pulse" />
            </div>
          ))}
        </div>
      ) : (
        <DndContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {pipelineColumns.map((column) => {
              const columnLeads = getLeadsByStatus(column.id);
              return (
                <div key={column.id} className="rounded-2xl border border-border/50 bg-card/30 p-3">
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
                </div>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
}