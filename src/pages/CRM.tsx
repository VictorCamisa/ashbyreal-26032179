import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Search, TrendingUp, UserCheck, DollarSign, Target } from 'lucide-react';
import { PipelineColumn } from '@/types/lead';
import { useOportunidades } from '@/hooks/useOportunidades';
import { NovaOportunidadeDialog } from '@/components/crm/NovaOportunidadeDialog';
import { PageLayout } from '@/components/layout/PageLayout';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { Lead } from '@/types/lead';

const pipelineColumns: PipelineColumn[] = [
  { id: 'novo_lead', title: 'Nova', color: 'bg-blue-500' },
  { id: 'qualificado', title: 'Qualificada', color: 'bg-amber-500' },
  { id: 'negociacao', title: 'Negociação', color: 'bg-violet-500' },
  { id: 'fechado', title: 'Fechada', color: 'bg-emerald-500' },
  { id: 'perdido', title: 'Perdida', color: 'bg-red-500' },
];

const origemColors: Record<string, string> = {
  WhatsApp: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Instagram: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
  Facebook: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Indicação: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  Site: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  Outros: 'bg-muted text-muted-foreground'
};

function DraggableOportunidadeCard({ oportunidade, navigate }: { oportunidade: Lead & { clienteId?: string }; navigate: (path: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: oportunidade.id,
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const clienteId = oportunidade.clienteId || oportunidade.id;

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 rounded-xl bg-card border border-border/50 cursor-grab active:cursor-grabbing hover:border-primary/50 transition-all hover:shadow-md group"
      onClick={() => navigate(`/cliente/${clienteId}`)}
    >
      <p className="text-sm font-medium mb-1 group-hover:text-primary transition-colors">{oportunidade.nome}</p>
      <p className="text-xs text-muted-foreground mb-2">{oportunidade.telefone}</p>
      <div className="flex items-center justify-between">
        <Badge variant="outline" className={`text-[10px] ${origemColors[oportunidade.origem]}`}>
          {oportunidade.origem}
        </Badge>
        <span className="text-xs font-medium">
          R$ {oportunidade.valorEstimado.toLocaleString('pt-BR')}
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
  const { oportunidades, isLoading, createOportunidade, isCreating, updateOportunidadeStatus } = useOportunidades();

  const filteredOportunidades = oportunidades.filter(op =>
    op.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.telefone.includes(searchTerm)
  );

  const getOportunidadesByStatus = (status: string) => filteredOportunidades.filter(op => op.status === status);

  const stats = {
    total: oportunidades.length,
    qualificados: oportunidades.filter(l => l.status === 'qualificado').length,
    fechados: oportunidades.filter(l => l.status === 'fechado').length,
    valorTotal: oportunidades.filter(l => l.status === 'fechado').reduce((acc, l) => acc + l.valorEstimado, 0),
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    await updateOportunidadeStatus(active.id as string, over.id as string);
  };

  return (
    <PageLayout
      title="Oportunidades"
      subtitle="Gerencie seu pipeline de vendas"
      icon={Target}
      showSparkle
      actions={
        <NovaOportunidadeDialog onSubmit={createOportunidade} isCreating={isCreating} />
      }
    >
      <div className="space-y-6">
        {/* KPIs */}
        <KPIGrid>
          <KPICard label="Total" value={stats.total} icon={Target} />
          <KPICard label="Qualificadas" value={stats.qualificados} icon={UserCheck} variant="warning" />
          <KPICard label="Fechadas" value={stats.fechados} icon={TrendingUp} variant="success" />
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
            placeholder="Buscar oportunidades..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-11 rounded-xl"
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
                const columnOportunidades = getOportunidadesByStatus(column.id);
                return (
                  <Card key={column.id} className="bg-muted/30 overflow-hidden">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-3 px-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${column.color}`} />
                        <span className="text-xs font-medium">{column.title}</span>
                        <span className="text-xs text-muted-foreground ml-auto bg-muted px-1.5 py-0.5 rounded-full">{columnOportunidades.length}</span>
                      </div>
                      <DroppableColumn column={column}>
                        {columnOportunidades.length === 0 ? (
                          <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border/50 rounded-xl">
                            Nenhuma oportunidade
                          </div>
                        ) : (
                          columnOportunidades.map((op) => (
                            <DraggableOportunidadeCard key={op.id} oportunidade={op} navigate={navigate} />
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
    </PageLayout>
  );
}
