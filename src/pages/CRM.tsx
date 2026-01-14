import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, TrendingUp, UserCheck, DollarSign, Target, Loader2, Trash2 } from 'lucide-react';
import { PipelineColumn } from '@/types/lead';
import { useOportunidades } from '@/hooks/useOportunidades';
import { NovaOportunidadeDialog } from '@/components/crm/NovaOportunidadeDialog';
import { PageLayout } from '@/components/layout/PageLayout';
import { KPICard, KPIGrid } from '@/components/layout/KPICard';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { supabase } from '@/integrations/supabase/client';
import { useEstoque } from '@/hooks/useEstoque';
import { toast } from '@/hooks/use-toast';
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

function DraggableOportunidadeCard({ 
  oportunidade, 
  navigate,
  onDelete 
}: { 
  oportunidade: Lead & { clienteId?: string }; 
  navigate: (path: string) => void;
  onDelete: (id: string) => void;
}) {
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
      className="p-3 rounded-xl bg-card border border-border/50 hover:border-primary/50 transition-all hover:shadow-md group relative"
    >
      <div 
        {...listeners}
        {...attributes}
        className="cursor-grab active:cursor-grabbing"
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
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon" 
            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive"
            onClick={(e) => e.stopPropagation()}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir oportunidade?</AlertDialogTitle>
            <AlertDialogDescription>
              A oportunidade de {oportunidade.nome} será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => onDelete(oportunidade.id)}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

interface CartItem {
  produtoId: string;
  nome: string;
  quantidade: number;
  preco: number;
}

export default function CRM() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  const { oportunidades, isLoading, createOportunidade, isCreating, updateOportunidadeStatus, deleteOportunidade } = useOportunidades();
  const { produtos } = useEstoque();

  // Pedido dialog state
  const [pedidoDialogOpen, setPedidoDialogOpen] = useState(false);
  const [selectedOportunidade, setSelectedOportunidade] = useState<(Lead & { clienteId?: string }) | null>(null);
  const [isCreatingPedido, setIsCreatingPedido] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProduto, setSelectedProduto] = useState('');
  const [quantidade, setQuantidade] = useState(1);
  const [observacoes, setObservacoes] = useState('');

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

    const newStatus = over.id as string;
    const oportunidade = oportunidades.find(op => op.id === active.id);

    // If moving to "fechado", open the order dialog
    if (newStatus === 'fechado' && oportunidade) {
      setSelectedOportunidade(oportunidade);
      setCart([]);
      setObservacoes('');
      setPedidoDialogOpen(true);
      return;
    }

    await updateOportunidadeStatus(active.id as string, newStatus);
  };

  const addToCart = () => {
    if (!selectedProduto) return;
    const produto = produtos.find(p => p.id === selectedProduto);
    if (!produto) return;

    const existing = cart.find(item => item.produtoId === selectedProduto);
    if (existing) {
      setCart(cart.map(item => 
        item.produtoId === selectedProduto 
          ? { ...item, quantidade: item.quantidade + quantidade }
          : item
      ));
    } else {
      setCart([...cart, {
        produtoId: produto.id,
        nome: produto.nome,
        quantidade,
        preco: produto.preco,
      }]);
    }
    setSelectedProduto('');
    setQuantidade(1);
  };

  const removeFromCart = (produtoId: string) => {
    setCart(cart.filter(item => item.produtoId !== produtoId));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);

  const handleCreatePedido = async () => {
    if (!selectedOportunidade || cart.length === 0) {
      toast({
        title: 'Erro',
        description: 'Adicione pelo menos um produto ao pedido',
        variant: 'destructive',
      });
      return;
    }

    setIsCreatingPedido(true);
    try {
      const clienteId = selectedOportunidade.clienteId;

      // Create the order
      const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert([{
          cliente_id: clienteId,
          status: 'pendente',
          valor_total: cartTotal,
          data_pedido: new Date().toISOString(),
          observacoes: observacoes || null,
        }])
        .select('id')
        .single();

      if (pedidoError) throw pedidoError;

      // Create order items
      const itens = cart.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produtoId,
        quantidade: item.quantidade,
        preco_unitario: item.preco,
        subtotal: item.preco * item.quantidade,
      }));

      const { error: itensError } = await supabase
        .from('pedido_itens')
        .insert(itens);

      if (itensError) throw itensError;

      // Update oportunidade status to fechado
      await updateOportunidadeStatus(selectedOportunidade.id, 'fechado');

      toast({
        title: 'Pedido criado!',
        description: `Pedido criado com ${cart.length} produto(s) no valor de R$ ${cartTotal.toFixed(2)}`,
      });

      setPedidoDialogOpen(false);
      setSelectedOportunidade(null);
      setCart([]);

    } catch (error) {
      console.error('Erro ao criar pedido:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o pedido',
        variant: 'destructive',
      });
    } finally {
      setIsCreatingPedido(false);
    }
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
                            <DraggableOportunidadeCard key={op.id} oportunidade={op} navigate={navigate} onDelete={deleteOportunidade} />
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

      {/* Pedido Dialog */}
      <Dialog open={pedidoDialogOpen} onOpenChange={setPedidoDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Criar Pedido - {selectedOportunidade?.nome}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Add products */}
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <Label className="text-xs">Produto</Label>
                <Select value={selectedProduto} onValueChange={setSelectedProduto}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {produtos.filter(p => p.ativo && (p.estoque > 0 || p.tipoProduto === 'CHOPP')).map(produto => (
                      <SelectItem key={produto.id} value={produto.id}>
                        {produto.nome} - R$ {produto.preco.toFixed(2)} {produto.tipoProduto === 'CHOPP' ? '(Sob Demanda)' : `(${produto.estoque} em estoque)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Qtd</Label>
                <div className="flex gap-1">
                  <Input 
                    type="number" 
                    min="1" 
                    value={quantidade}
                    onChange={(e) => setQuantidade(parseInt(e.target.value) || 1)}
                    className="w-16"
                  />
                  <Button onClick={addToCart} disabled={!selectedProduto}>
                    +
                  </Button>
                </div>
              </div>
            </div>

            {/* Cart */}
            {cart.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-left">Produto</th>
                      <th className="p-2 text-center">Qtd</th>
                      <th className="p-2 text-right">Subtotal</th>
                      <th className="p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map(item => (
                      <tr key={item.produtoId} className="border-t">
                        <td className="p-2">{item.nome}</td>
                        <td className="p-2 text-center">{item.quantidade}</td>
                        <td className="p-2 text-right">R$ {(item.preco * item.quantidade).toFixed(2)}</td>
                        <td className="p-2 text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeFromCart(item.produtoId)}
                          >
                            ×
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted">
                    <tr>
                      <td colSpan={2} className="p-2 font-medium">Total</td>
                      <td className="p-2 text-right font-bold">R$ {cartTotal.toFixed(2)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {cart.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                Adicione produtos ao pedido
              </div>
            )}

            {/* Observations */}
            <div>
              <Label className="text-xs">Observações</Label>
              <Textarea 
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações do pedido..."
                rows={2}
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setPedidoDialogOpen(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreatePedido} 
                disabled={isCreatingPedido || cart.length === 0}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {isCreatingPedido ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Criar Pedido
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
