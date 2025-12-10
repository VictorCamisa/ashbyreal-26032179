import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { 
  Search, 
  Upload, 
  Plus,
  ArrowUpCircle,
  ArrowDownCircle,
  Building2,
  User,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  Check,
  Calendar,
  List,
  Tag,
  X
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ImportarTransacoesDialog } from './ImportarTransacoesDialog';
import { NovaTransacaoDialog } from './NovaTransacaoDialog';
import { EditarTransacaoDialog } from './EditarTransacaoDialog';
import { CalendarioFinanceiro } from './CalendarioFinanceiro';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export function TransacoesUnificadas() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [entityFilter, setEntityFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [tagFilter, setTagFilter] = useState<string>('');
  const [showImport, setShowImport] = useState(false);
  const [showNovaTransacao, setShowNovaTransacao] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'PAGAR' | 'RECEBER'>('PAGAR');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [referenceMonth, setReferenceMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');

  const monthStr = referenceMonth.toISOString().slice(0, 7);
  const monthLabel = referenceMonth.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

  // Fetch entities for creating transactions
  const { data: entities } = useQuery({
    queryKey: ['entities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('entities')
        .select('*')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    }
  });

  // Fetch all transactions with related data
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transacoes-unificadas', monthStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(name),
          subcategories(name),
          accounts(name),
          entities(name, type)
        `)
        .gte('due_date', `${monthStr}-01`)
        .lte('due_date', `${monthStr}-31`)
        .order('due_date', { ascending: false });

      if (error) throw error;
      return data;
    }
  });

  // Get all unique tags from transactions
  const allTags = useMemo(() => {
    if (!transactions) return [];
    const tagSet = new Set<string>();
    transactions.forEach(t => {
      const tags = t.tags as string[] | null;
      if (tags && Array.isArray(tags)) {
        tags.forEach(tag => tagSet.add(tag));
      }
    });
    return Array.from(tagSet).sort();
  }, [transactions]);

  // Mark as paid mutation
  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error } = await supabase
        .from('transactions')
        .update({ 
          status: 'PAGO',
          payment_date: today
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-alerts'] });
      toast.success('Transação marcada como paga!');
    },
    onError: (error: any) => {
      toast.error('Erro ao marcar como pago: ' + error.message);
    }
  });

  // Add/remove tag mutation
  const updateTagsMutation = useMutation({
    mutationFn: async ({ id, tags }: { id: string; tags: string[] }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ tags })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success('Transação excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  // Navigate months
  const handlePrevMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(t => {
      const matchesSearch = searchTerm === '' || 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.accounts?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTipo = tipoFilter === 'todos' || t.tipo === tipoFilter;
      const matchesEntity = entityFilter === 'todos' || t.entities?.type === entityFilter;
      const matchesStatus = statusFilter === 'todos' || t.status === statusFilter;
      
      // Tag filter
      const tags = t.tags as string[] | null;
      const matchesTag = tagFilter === '' || (tags && tags.includes(tagFilter));
      
      return matchesSearch && matchesTipo && matchesEntity && matchesStatus && matchesTag;
    });
  }, [transactions, searchTerm, tipoFilter, entityFilter, statusFilter, tagFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const receitas = filteredTransactions
      .filter(t => t.tipo === 'RECEBER')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    const despesas = filteredTransactions
      .filter(t => t.tipo === 'PAGAR')
      .reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0);
    
    return { receitas, despesas, saldo: receitas - despesas };
  }, [filteredTransactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleNovaReceita = () => {
    setTipoTransacao('RECEBER');
    setShowNovaTransacao(true);
  };

  const handleNovaDespesa = () => {
    setTipoTransacao('PAGAR');
    setShowNovaTransacao(true);
  };

  const handleAddTag = (transactionId: string, currentTags: string[] | null, newTag: string) => {
    const tags = currentTags || [];
    if (!tags.includes(newTag) && newTag.trim()) {
      updateTagsMutation.mutate({ id: transactionId, tags: [...tags, newTag.trim()] });
    }
  };

  const handleRemoveTag = (transactionId: string, currentTags: string[] | null, tagToRemove: string) => {
    const tags = currentTags || [];
    updateTagsMutation.mutate({ id: transactionId, tags: tags.filter(t => t !== tagToRemove) });
  };

  // Get entity ID for creating transactions
  const getEntityIdForCreate = () => {
    if (entityFilter !== 'todos') {
      return entities?.find(e => e.type === entityFilter)?.id;
    }
    return entities?.find(e => e.type === 'LOJA')?.id || entities?.[0]?.id;
  };

  return (
    <div className="space-y-4">
      {/* Header with filters and actions */}
      <div className="flex flex-col gap-4">
        {/* Month navigation + Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium capitalize min-w-[140px] text-center">
              {monthLabel}
            </span>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border rounded-lg p-0.5">
              <Button 
                variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 px-2"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
              <Button 
                variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} 
                size="sm" 
                className="h-7 px-2"
                onClick={() => setViewMode('calendar')}
              >
                <Calendar className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleNovaReceita} className="gap-2">
              <Plus className="h-4 w-4 text-emerald-600" />
              <span className="hidden sm:inline">Receita</span>
            </Button>
            <Button size="sm" onClick={handleNovaDespesa} className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Despesa</span>
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 max-w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="RECEBER">Receitas</SelectItem>
              <SelectItem value="PAGAR">Despesas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="LOJA">Loja</SelectItem>
              <SelectItem value="PARTICULAR">Particular</SelectItem>
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="PAGO">Pago</SelectItem>
              <SelectItem value="PREVISTO">Pendente</SelectItem>
              <SelectItem value="ATRASADO">Atrasado</SelectItem>
            </SelectContent>
          </Select>

          {/* Tag filter */}
          {allTags.length > 0 && (
            <Select value={tagFilter} onValueChange={setTagFilter}>
              <SelectTrigger className="w-[120px]">
                <Tag className="h-3.5 w-3.5 mr-1" />
                <SelectValue placeholder="Tags" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todas</SelectItem>
                {allTags.map(tag => (
                  <SelectItem key={tag} value={tag}>{tag}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <ArrowUpCircle className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Receitas</p>
                <p className="text-lg font-semibold text-emerald-600">
                  {formatCurrency(totals.receitas)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-destructive/10">
                <ArrowDownCircle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Despesas</p>
                <p className="text-lg font-semibold text-destructive">
                  {formatCurrency(totals.despesas)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(
          "border-l-4",
          totals.saldo >= 0 ? "border-l-emerald-500" : "border-l-destructive"
        )}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div>
                <p className="text-xs text-muted-foreground">Saldo</p>
                <p className={cn(
                  "text-lg font-semibold",
                  totals.saldo >= 0 ? "text-emerald-600" : "text-destructive"
                )}>
                  {formatCurrency(totals.saldo)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <CalendarioFinanceiro
          transactions={filteredTransactions}
          referenceMonth={referenceMonth}
          onMonthChange={setReferenceMonth}
          onTransactionClick={(t) => setEditingTransaction(t)}
        />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Carregando transações...
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                Nenhuma transação encontrada
              </div>
            ) : (
              <div className="divide-y">
                {filteredTransactions.map((t) => {
                  const isReceita = t.tipo === 'RECEBER';
                  const isOverdue = t.status === 'ATRASADO' || 
                    (t.status === 'PREVISTO' && new Date(t.due_date) < new Date());
                  const isPaid = t.status === 'PAGO';
                  const tags = t.tags as string[] | null;
                  
                  return (
                    <div 
                      key={t.id}
                      className={cn(
                        "flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors",
                        isOverdue && !isPaid && "bg-destructive/5"
                      )}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={cn(
                          "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                          isReceita ? "bg-emerald-100 dark:bg-emerald-900/30" : "bg-red-100 dark:bg-red-900/30"
                        )}>
                          {isReceita 
                            ? <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
                            : <ArrowDownCircle className="h-4 w-4 text-destructive" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{t.description || 'Sem descrição'}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(t.due_date), 'dd/MM/yyyy')}
                            </span>
                            {t.categories?.name && (
                              <Badge variant="outline" className="text-xs py-0 h-5">
                                {t.categories.name}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs py-0 h-5 gap-1">
                              {t.entities?.type === 'LOJA' ? (
                                <><Building2 className="h-3 w-3" /> Loja</>
                              ) : (
                                <><User className="h-3 w-3" /> Part.</>
                              )}
                            </Badge>
                            {/* Tags */}
                            {tags && tags.map(tag => (
                              <Badge 
                                key={tag} 
                                variant="secondary" 
                                className="text-xs py-0 h-5 gap-1 bg-primary/10 text-primary"
                              >
                                <Tag className="h-2.5 w-2.5" />
                                {tag}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveTag(t.id, tags, tag);
                                  }}
                                  className="ml-0.5 hover:text-destructive"
                                >
                                  <X className="h-2.5 w-2.5" />
                                </button>
                              </Badge>
                            ))}
                            {/* Add tag input */}
                            <TagInput 
                              onAdd={(newTag) => handleAddTag(t.id, tags, newTag)}
                              suggestions={allTags}
                            />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Badge 
                          variant={isPaid ? 'default' : isOverdue ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {isPaid ? 'Pago' : isOverdue ? 'Atrasado' : 'Pendente'}
                        </Badge>
                        <span className={cn(
                          "text-sm font-semibold tabular-nums min-w-[100px] text-right",
                          isReceita ? "text-emerald-600" : "text-destructive"
                        )}>
                          {isReceita ? '+' : '-'}{formatCurrency(Math.abs(Number(t.amount)))}
                        </span>
                        <div className="flex items-center gap-1">
                          {/* Mark as paid button */}
                          {!isPaid && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                                    onClick={() => markAsPaidMutation.mutate(t.id)}
                                    disabled={markAsPaidMutation.isPending}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Marcar como pago</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setEditingTransaction(t)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => setDeletingId(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Dialogs */}
      <ImportarTransacoesDialog 
        open={showImport} 
        onOpenChange={setShowImport} 
      />

      {getEntityIdForCreate() && (
        <NovaTransacaoDialog
          open={showNovaTransacao}
          onOpenChange={setShowNovaTransacao}
          entityId={getEntityIdForCreate()!}
          tipo={tipoTransacao}
          onSave={() => {
            queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
            setShowNovaTransacao(false);
          }}
          isLoading={false}
        />
      )}

      <EditarTransacaoDialog
        open={!!editingTransaction}
        onOpenChange={(open) => !open && setEditingTransaction(null)}
        transaction={editingTransaction}
        onSave={() => {
          queryClient.invalidateQueries({ queryKey: ['transacoes-unificadas'] });
          setEditingTransaction(null);
        }}
      />

      <AlertDialog open={!!deletingId} onOpenChange={(open) => !open && setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deletingId) {
                  deleteMutation.mutate(deletingId);
                  setDeletingId(null);
                }
              }}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Tag input component
function TagInput({ 
  onAdd, 
  suggestions 
}: { 
  onAdd: (tag: string) => void; 
  suggestions: string[];
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (value.trim()) {
      onAdd(value.trim());
      setValue('');
      setIsOpen(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <Tag className="h-3 w-3" />
        <span>+</span>
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleSubmit();
          }
          if (e.key === 'Escape') {
            setIsOpen(false);
            setValue('');
          }
        }}
        placeholder="Nova tag..."
        className="h-5 w-20 text-xs py-0 px-1"
        autoFocus
        list="tag-suggestions"
      />
      <datalist id="tag-suggestions">
        {suggestions.map(s => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-5 w-5" 
        onClick={handleSubmit}
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button 
        size="icon" 
        variant="ghost" 
        className="h-5 w-5" 
        onClick={() => { setIsOpen(false); setValue(''); }}
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}
