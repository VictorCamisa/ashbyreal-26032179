import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, endOfMonth } from 'date-fns';
import { formatMonthYear } from '@/lib/dateUtils';
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
  X,
  CreditCard,
  BarChart3,
  CheckSquare,
  Square,
  MoreHorizontal,
  Repeat,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ImportarTransacoesDialog } from './ImportarTransacoesDialog';
import { NovaTransacaoDialog } from './NovaTransacaoDialog';
import { EditarTransacaoDialog } from './EditarTransacaoDialog';
import { EditarRecorrenteConfirmDialog } from './EditarRecorrenteConfirmDialog';
import { ExcluirRecorrenteConfirmDialog } from './ExcluirRecorrenteConfirmDialog';
import { TornarRecorrenteDialog } from './TornarRecorrenteDialog';
import { CalendarioFinanceiro } from './CalendarioFinanceiro';
import { TransacoesDRE } from './TransacoesDRE';
import { TransactionRow } from './TransactionRow';
import { GerenciarCategoriasDialog } from './GerenciarCategoriasDialog';
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
import type { TransactionFilter } from '@/pages/Financeiro';

interface TransacoesUnificadasProps {
  initialFilter?: TransactionFilter;
  onFilterChange?: (filter: TransactionFilter) => void;
}

// Tipo unificado para transações
interface UnifiedTransaction {
  id: string;
  description: string | null;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  tipo: 'PAGAR' | 'RECEBER';
  origin: string;
  origin_reference_id?: string | null;
  entity_id: string;
  categories?: { name: string; group: string | null } | null;
  subcategories?: { name: string } | null;
  accounts?: { name: string } | null;
  entities?: { name: string; type: string } | null;
  credit_cards?: { name: string } | null;
  tags?: string[] | null;
  installment_number?: number;
  total_installments?: number;
  isCardTransaction?: boolean;
  isFaturaCartao?: boolean;
  recurrence_id?: string | null;
}

export function TransacoesUnificadas({ initialFilter = 'all', onFilterChange }: TransacoesUnificadasProps) {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [entityFilter, setEntityFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('pendentes');
  
  const [tagFilter, setTagFilter] = useState<string>('');
  const [recorrenteFilter, setRecorrenteFilter] = useState<string>('todos');
  const [showImport, setShowImport] = useState(false);
  const [showNovaTransacao, setShowNovaTransacao] = useState(false);
  const [tipoTransacao, setTipoTransacao] = useState<'PAGAR' | 'RECEBER'>('PAGAR');
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [referenceMonth, setReferenceMonth] = useState(new Date());
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'dre'>('list');

  // Batch selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);
  const [recurringTransaction, setRecurringTransaction] = useState<any>(null);
  
  // State for recurring edit confirmation
  const [pendingEditTransaction, setPendingEditTransaction] = useState<any>(null);
  const [editFutureMode, setEditFutureMode] = useState<boolean>(false);
  
  // State for recurring delete confirmation
  const [pendingDeleteTransaction, setPendingDeleteTransaction] = useState<any>(null);
  
  // Expanded invoice state - to show credit card transactions
  const [expandedInvoices, setExpandedInvoices] = useState<Set<string>>(new Set());
  
  // Category management dialog
  const [showCategoriesDialog, setShowCategoriesDialog] = useState(false);
  useEffect(() => {
    if (initialFilter === 'overdue') {
      setStatusFilter('ATRASADO');
    } else if (initialFilter === 'pending') {
      setStatusFilter('PREVISTO');
    }
    // If initialFilter is 'all', keep the default 'pendentes'
  }, [initialFilter]);

  // Notify parent when filter changes
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    if (onFilterChange) {
      if (value === 'ATRASADO') {
        onFilterChange('overdue');
      } else if (value === 'PREVISTO') {
        onFilterChange('pending');
      } else {
        onFilterChange('all');
      }
    }
  };

  const monthStr = referenceMonth.toISOString().slice(0, 7);
  const lastDayOfMonth = format(endOfMonth(referenceMonth), 'yyyy-MM-dd');
  const monthLabel = formatMonthYear(referenceMonth);

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
  const { data: bankTransactions, isLoading: isLoadingBank } = useQuery({
    queryKey: ['transacoes-banco', monthStr, lastDayOfMonth],
    queryFn: async () => {
      const firstDay = `${monthStr}-01`;
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          categories(name, group),
          subcategories(name),
          accounts(name),
          entities(name, type)
        `)
        .gte('due_date', firstDay)
        .lte('due_date', lastDayOfMonth)
        .order('due_date', { ascending: true });

      if (error) throw error;
      return data;
    }
  });

  // Compute overdue status locally instead of mutating the database on every load
  // This prevents the bug where ALL PREVISTO transactions get marked as ATRASADO permanently

  const isLoading = isLoadingBank;

  // Map bank transactions to unified format (without individual card transactions)
  const transactions: UnifiedTransaction[] = useMemo(() => {
    const unified: UnifiedTransaction[] = [];

    // Add bank transactions
    if (bankTransactions) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      bankTransactions.forEach((t) => {
        // Compute overdue/due-soon status locally instead of writing to DB
        let displayStatus: string = t.status;
        if (t.status === 'PREVISTO') {
          const dueDate = new Date(t.due_date);
          dueDate.setHours(0, 0, 0, 0);
          const diffDays = (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
          if (dueDate < today) {
            displayStatus = 'ATRASADO';
          } else if (diffDays <= 5) {
            displayStatus = 'VENCENDO';
          }
        }
        
        unified.push({
          id: t.id,
          description: t.description,
          amount: Math.abs(Number(t.amount)),
          due_date: t.due_date,
          payment_date: t.payment_date,
          status: displayStatus,
          tipo: t.tipo as 'PAGAR' | 'RECEBER',
          origin: t.origin || 'MANUAL',
          origin_reference_id: t.origin_reference_id,
          entity_id: t.entity_id,
          categories: t.categories,
          subcategories: t.subcategories,
          accounts: t.accounts,
          entities: t.entities,
          tags: t.tags as string[] | null,
          isCardTransaction: false,
          isFaturaCartao: t.origin === 'FATURA_CARTAO',
          recurrence_id: t.recurrence_id,
        });
      });
    }

    // Sort by due_date ascending (oldest first - chronological order)
    return unified.sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [bankTransactions]);

  // Category color mapping based on group
  const getCategoryColor = (group: string | null) => {
    switch (group) {
      case 'FIXA': return 'bg-blue-500/10 text-blue-700 border-blue-500/30';
      case 'VARIAVEL': return 'bg-purple-500/10 text-purple-700 border-purple-500/30';
      case 'IMPOSTO': return 'bg-red-500/10 text-red-700 border-red-500/30';
      case 'PESSOA': return 'bg-amber-500/10 text-amber-700 border-amber-500/30';
      case 'ASHBY': return 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30';
      case 'PARTICULAR': return 'bg-pink-500/10 text-pink-700 border-pink-500/30';
      case 'GERAL': return 'bg-gray-500/10 text-gray-700 border-gray-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  // Status color mapping
  // 🟢 Verde = Pago | 🟡 Amarelo = Vence em breve (≤5 dias) | 🔴 Vermelho = Atrasado | ⚫ Cinza = Cancelado
  const getStatusStyle = (status: string, isOverdue: boolean) => {
    if (status === 'PAGO') {
      return 'bg-emerald-500 hover:bg-emerald-600 text-white';
    }
    if (status === 'ATRASADO' || isOverdue) {
      return 'bg-destructive hover:bg-destructive/90 text-white';
    }
    if (status === 'VENCENDO') {
      return 'bg-amber-500 hover:bg-amber-600 text-white';
    }
    if (status === 'CANCELADO') {
      return 'bg-muted text-muted-foreground hover:bg-muted';
    }
    // PREVISTO (vencimento distante)
    return 'bg-slate-400 hover:bg-slate-500 text-white';
  };

  const getStatusLabel = (status: string, isOverdue: boolean) => {
    if (status === 'PAGO') return 'Pago';
    if (status === 'ATRASADO' || isOverdue) return 'Atrasado';
    if (status === 'VENCENDO') return 'Vence em breve';
    if (status === 'CANCELADO') return 'Cancelado';
    return 'Previsto';
  };

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
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-alerts'] });
      toast.success('Transação marcada como paga!');
    },
    onError: (error: any) => {
      toast.error('Erro ao marcar como pago: ' + error.message);
    }
  });

  // Batch mark as paid mutation
  const batchMarkAsPaidMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const { error } = await supabase
        .from('transactions')
        .update({ status: 'PAGO', payment_date: today })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-alerts'] });
      toast.success(`${selectedIds.size} transações marcadas como pagas!`);
      setSelectedIds(new Set());
    },
    onError: (error: any) => {
      toast.error('Erro ao marcar como pago: ' + error.message);
    }
  });

  // Batch change entity mutation
  const batchChangeEntityMutation = useMutation({
    mutationFn: async ({ ids, entityId }: { ids: string[]; entityId: string }) => {
      const { error } = await supabase
        .from('transactions')
        .update({ entity_id: entityId })
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      toast.success(`${selectedIds.size} transações atualizadas!`);
      setSelectedIds(new Set());
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar entidade: ' + error.message);
    }
  });

  // Batch delete mutation
  const batchDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success(`${selectedIds.size} transações excluídas!`);
      setSelectedIds(new Set());
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  // Batch change status mutation
  const batchChangeStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const updates: any = { status };
      if (status === 'PAGO') {
        updates.payment_date = format(new Date(), 'yyyy-MM-dd');
      }
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .in('id', ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['financeiro-alerts'] });
      toast.success(`${selectedIds.size} transações atualizadas!`);
      setSelectedIds(new Set());
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar status: ' + error.message);
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
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
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
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success('Transação excluída com sucesso!');
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  // Delete all future recurring transactions mutation
  const deleteRecurringMutation = useMutation({
    mutationFn: async ({ transaction, deleteAll }: { transaction: any; deleteAll: boolean }) => {
      if (deleteAll) {
        // Delete this and all future with same origin description
        // Since recurrence_id is null, match by description + origin
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('description', transaction.description)
          .eq('origin', 'RECORRENTE')
          .gte('due_date', transaction.due_date);
        if (error) throw error;
      } else {
        // Delete only this one
        const { error } = await supabase
          .from('transactions')
          .delete()
          .eq('id', transaction.id);
        if (error) throw error;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      toast.success(variables.deleteAll ? 'Transações recorrentes excluídas!' : 'Transação excluída com sucesso!');
      setPendingDeleteTransaction(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir: ' + error.message);
    }
  });

  // Create transaction mutation
  const createMutation = useMutation({
    mutationFn: async (transaction: any) => {
      const { error } = await supabase
        .from('transactions')
        .insert([transaction]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] });
      toast.success('Transação criada com sucesso!');
      setShowNovaTransacao(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao criar transação: ' + error.message);
    }
  });

  // Create multiple transactions mutation (for recurring)
  const createMultipleMutation = useMutation({
    mutationFn: async (transactions: any[]) => {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactions)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] });
      toast.success(`${data?.length || 0} transações criadas com sucesso!`);
      setShowNovaTransacao(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao criar transações: ' + error.message);
    }
  });

  // Update transaction mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...updates }: any) => {
      const { error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] });
      toast.success('Transação atualizada com sucesso!');
      setEditingTransaction(null);
      setEditFutureMode(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar transação: ' + error.message);
    }
  });

  // Update future recurring transactions mutation
  const updateFutureMutation = useMutation({
    mutationFn: async ({ baseTransaction, updates }: { baseTransaction: any; updates: any }) => {
      const { id, ...updateFields } = updates;
      
      // Update the current transaction
      const { error: currentError } = await supabase
        .from('transactions')
        .update(updateFields)
        .eq('id', id);
      if (currentError) throw currentError;

      // Find and update all future transactions with the same recurrence_id
      if (baseTransaction.recurrence_id) {
        const { error: futureError } = await supabase
          .from('transactions')
          .update({
            description: updateFields.description,
            amount: updateFields.amount,
            category_id: updateFields.category_id,
            subcategory_id: updateFields.subcategory_id,
            account_id: updateFields.account_id,
            notes: updateFields.notes,
          })
          .eq('recurrence_id', baseTransaction.recurrence_id)
          .gt('due_date', baseTransaction.due_date);
        if (futureError) throw futureError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transacoes-banco'] });
      queryClient.invalidateQueries({ queryKey: ['transacoes'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-financeiro'] });
      toast.success('Transação e ocorrências futuras atualizadas!');
      setEditingTransaction(null);
      setEditFutureMode(false);
    },
    onError: (error: any) => {
      toast.error('Erro ao atualizar transações: ' + error.message);
    }
  });

  // Handle edit click - check if recurring
  const handleEditClick = useCallback((transaction: any) => {
    const isRecorrente = transaction.origin === 'RECORRENTE' || !!transaction.recurrence_id;
    if (isRecorrente) {
      setPendingEditTransaction(transaction);
    } else {
      setEditingTransaction(transaction);
    }
  }, []);

  // Handle edit single (only this occurrence)
  const handleEditSingle = useCallback(() => {
    if (pendingEditTransaction) {
      setEditingTransaction(pendingEditTransaction);
      setEditFutureMode(false);
      setPendingEditTransaction(null);
    }
  }, [pendingEditTransaction]);

  // Handle edit future (this and all future occurrences)
  const handleEditFuture = useCallback(() => {
    if (pendingEditTransaction) {
      setEditingTransaction(pendingEditTransaction);
      setEditFutureMode(true);
      setPendingEditTransaction(null);
    }
  }, [pendingEditTransaction]);

  // Navigate months
  const handlePrevMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setReferenceMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Filter transactions (only bank transactions, no credit card)
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];
    
    return transactions.filter(t => {
      const matchesSearch = searchTerm === '' || 
        t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.categories?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.accounts?.name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesTipo = tipoFilter === 'todos' || t.tipo === tipoFilter;
      const matchesEntity = entityFilter === 'todos' || t.entities?.type === entityFilter;
      // Status filter with special 'pendentes' option
      const matchesStatus = statusFilter === 'todos' || 
        (statusFilter === 'pendentes' && (t.status === 'PREVISTO' || t.status === 'ATRASADO')) ||
        t.status === statusFilter;
      
      // Tag filter
      const tags = t.tags as string[] | null;
      const matchesTag = tagFilter === '' || (tags && tags.includes(tagFilter));
      
      // Recorrente filter - uses origin field which determines if transaction is recurring
      const isRecorrente = t.origin === 'RECORRENTE' || !!t.recurrence_id;
      const matchesRecorrente = recorrenteFilter === 'todos' || 
        (recorrenteFilter === 'recorrente' && isRecorrente) ||
        (recorrenteFilter === 'avulsa' && !isRecorrente);
      
      return matchesSearch && matchesTipo && matchesEntity && matchesStatus && matchesTag && matchesRecorrente;
    });
  }, [transactions, searchTerm, tipoFilter, entityFilter, statusFilter, tagFilter, recorrenteFilter]);

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

  // Selection handlers
  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedIds);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedIds(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTransactions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTransactions.map(t => t.id)));
    }
  };

  // Filter only bank transactions (not card transactions which have "card-" prefix)
  const getBankTransactionIds = () => {
    return Array.from(selectedIds).filter(id => !id.startsWith('card-'));
  };

  const handleBatchMarkAsPaid = () => {
    const bankIds = getBankTransactionIds();
    if (bankIds.length > 0) {
      batchMarkAsPaidMutation.mutate(bankIds);
    } else {
      toast.error('Nenhuma transação bancária selecionada. Transações de cartão não podem ser marcadas como pagas aqui.');
    }
  };

  const handleBatchChangeEntity = (entityId: string) => {
    const bankIds = getBankTransactionIds();
    if (bankIds.length > 0) {
      batchChangeEntityMutation.mutate({ ids: bankIds, entityId });
    } else {
      toast.error('Nenhuma transação bancária selecionada.');
    }
  };

  const handleBatchChangeStatus = (status: string) => {
    const bankIds = getBankTransactionIds();
    if (bankIds.length > 0) {
      batchChangeStatusMutation.mutate({ ids: bankIds, status });
    } else {
      toast.error('Nenhuma transação bancária selecionada.');
    }
  };

  const handleBatchDelete = () => {
    const bankIds = getBankTransactionIds();
    if (bankIds.length > 0) {
      batchDeleteMutation.mutate(bankIds);
      setShowBatchDeleteConfirm(false);
    } else {
      toast.error('Nenhuma transação bancária selecionada.');
    }
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="h-7 px-2"
                      onClick={() => setViewMode('list')}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Lista</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={viewMode === 'dre' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="h-7 px-2"
                      onClick={() => setViewMode('dre')}
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>DRE</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant={viewMode === 'calendar' ? 'secondary' : 'ghost'} 
                      size="sm" 
                      className="h-7 px-2"
                      onClick={() => setViewMode('calendar')}
                    >
                      <Calendar className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Calendário</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={() => setShowCategoriesDialog(true)} className="gap-2">
                    <Tag className="h-4 w-4" />
                    <span className="hidden sm:inline">Categorias</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Gerenciar Categorias</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button variant="outline" size="sm" onClick={() => setShowImport(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleNovaReceita} className="gap-2 text-emerald-600 hover:text-emerald-700 border-emerald-200 hover:border-emerald-300 hover:bg-emerald-50">
              <Plus className="h-4 w-4" />
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

          <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="pendentes">A Pagar/Atrasado</SelectItem>
              <SelectItem value="PAGO">Pago</SelectItem>
              <SelectItem value="PREVISTO">Pendente</SelectItem>
              <SelectItem value="ATRASADO">Atrasado</SelectItem>
            </SelectContent>
          </Select>

          {/* Recorrente filter */}
          <Select value={recorrenteFilter} onValueChange={setRecorrenteFilter}>
            <SelectTrigger className="w-[130px]">
              <Repeat className="h-3.5 w-3.5 mr-1" />
              <SelectValue placeholder="Recorrência" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="recorrente">Recorrentes</SelectItem>
              <SelectItem value="avulsa">Avulsas</SelectItem>
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

      {/* Batch Actions Bar */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">
                  {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Limpar seleção
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleBatchMarkAsPaid}
                  disabled={batchMarkAsPaidMutation.isPending}
                >
                  <Check className="h-4 w-4 text-emerald-600" />
                  Marcar como Pago
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <MoreHorizontal className="h-4 w-4" />
                      Mais Ações
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleBatchChangeStatus('PREVISTO')}>
                      Marcar como Pendente
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleBatchChangeStatus('ATRASADO')}>
                      Marcar como Atrasado
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {entities?.map(entity => (
                      <DropdownMenuItem 
                        key={entity.id}
                        onClick={() => handleBatchChangeEntity(entity.id)}
                      >
                        Mover para {entity.name}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-destructive"
                      onClick={() => setShowBatchDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Selecionadas
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          onTransactionClick={(t) => handleEditClick(t)}
        />
      )}

      {/* DRE View */}
      {viewMode === 'dre' && (
        <TransacoesDRE
          transactions={filteredTransactions}
          isLoading={isLoading}
          onEdit={(t) => handleEditClick(t)}
          onDelete={(id) => setDeletingId(id)}
          onMarkAsPaid={(id) => markAsPaidMutation.mutate(id)}
          onRemoveTag={handleRemoveTag}
          formatCurrency={formatCurrency}
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
                {/* Header row with select all */}
                <div className="flex items-center gap-3 px-4 py-2 bg-muted/30 border-b">
                  <Checkbox
                    checked={selectedIds.size === filteredTransactions.length && filteredTransactions.length > 0}
                    onCheckedChange={toggleSelectAll}
                  />
                  <span className="text-xs text-muted-foreground">
                    Selecionar todas ({filteredTransactions.length})
                  </span>
                </div>

                {filteredTransactions.map((t) => (
                  <TransactionRow
                    key={t.id}
                    transaction={t}
                    isSelected={selectedIds.has(t.id)}
                    onToggleSelection={() => toggleSelection(t.id)}
                    onMarkAsPaid={() => markAsPaidMutation.mutate(t.id)}
                    onEdit={() => handleEditClick(t)}
                    onDelete={() => {
                      const isRecorrente = t.origin === 'RECORRENTE' || !!t.recurrence_id;
                      if (isRecorrente) {
                        setPendingDeleteTransaction(t);
                      } else {
                        setDeletingId(t.id);
                      }
                    }}
                    onRecurring={() => setRecurringTransaction(t)}
                    onAddTag={(tag) => handleAddTag(t.id, t.tags as string[] | null, tag)}
                    onRemoveTag={(tag) => handleRemoveTag(t.id, t.tags as string[] | null, tag)}
                    allTags={allTags}
                    isMarkingPaid={markAsPaidMutation.isPending}
                    formatCurrency={formatCurrency}
                    getCategoryColor={getCategoryColor}
                    getStatusStyle={getStatusStyle}
                    getStatusLabel={getStatusLabel}
                  />
                ))}
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

      <NovaTransacaoDialog
        open={showNovaTransacao}
        onOpenChange={setShowNovaTransacao}
        tipo={tipoTransacao}
        onSave={(transaction) => createMutation.mutate(transaction)}
        onSaveMultiple={(transactions) => createMultipleMutation.mutate(transactions)}
        isLoading={createMutation.isPending || createMultipleMutation.isPending}
        defaultEntityId={entityFilter !== 'todos' ? entities?.find(e => e.type === entityFilter)?.id : undefined}
      />

      {/* Recurring edit confirmation modal */}
      <EditarRecorrenteConfirmDialog
        open={!!pendingEditTransaction}
        onOpenChange={(open) => !open && setPendingEditTransaction(null)}
        transactionDescription={pendingEditTransaction?.description}
        onEditSingle={handleEditSingle}
        onEditFuture={handleEditFuture}
      />

      {/* Recurring delete confirmation modal */}
      <ExcluirRecorrenteConfirmDialog
        open={!!pendingDeleteTransaction}
        onOpenChange={(open) => !open && setPendingDeleteTransaction(null)}
        transactionDescription={pendingDeleteTransaction?.description}
        onDeleteSingle={() => {
          if (pendingDeleteTransaction) {
            deleteRecurringMutation.mutate({ transaction: pendingDeleteTransaction, deleteAll: false });
          }
        }}
        onDeleteAll={() => {
          if (pendingDeleteTransaction) {
            deleteRecurringMutation.mutate({ transaction: pendingDeleteTransaction, deleteAll: true });
          }
        }}
        isLoading={deleteRecurringMutation.isPending}
      />

      <EditarTransacaoDialog
        open={!!editingTransaction}
        onOpenChange={(open) => {
          if (!open) {
            setEditingTransaction(null);
            setEditFutureMode(false);
          }
        }}
        transaction={editingTransaction}
        onSave={(updates) => {
          if (editFutureMode && editingTransaction) {
            updateFutureMutation.mutate({ 
              baseTransaction: editingTransaction, 
              updates 
            });
          } else {
            updateMutation.mutate(updates);
          }
        }}
        isLoading={updateMutation.isPending || updateFutureMutation.isPending}
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

      {/* Batch delete confirmation */}
      <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão em lote</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir {selectedIds.size} transações? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBatchDelete}
              disabled={batchDeleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir {selectedIds.size} transações
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Tornar Recorrente Dialog */}
      <TornarRecorrenteDialog
        open={!!recurringTransaction}
        onOpenChange={(open) => !open && setRecurringTransaction(null)}
        transaction={recurringTransaction}
        onConfirm={(transactions) => {
          createMultipleMutation.mutate(transactions);
          setRecurringTransaction(null);
        }}
        isLoading={createMultipleMutation.isPending}
      />

      {/* Gerenciar Categorias Dialog */}
      <GerenciarCategoriasDialog
        open={showCategoriesDialog}
        onOpenChange={setShowCategoriesDialog}
      />
    </div>
  );
}

