import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  ChevronRight,
  ChevronDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Pencil,
  Trash2,
  Check,
  CreditCard,
  Building2,
  User,
  Tag,
  X,
  ChevronsUpDown,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

interface UnifiedTransaction {
  id: string;
  description: string | null;
  amount: number;
  due_date: string;
  payment_date: string | null;
  status: string;
  tipo: 'PAGAR' | 'RECEBER';
  origin: string;
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
}

interface TransacoesDREProps {
  transactions: UnifiedTransaction[];
  isLoading: boolean;
  onEdit: (transaction: UnifiedTransaction) => void;
  onDelete: (id: string) => void;
  onMarkAsPaid: (id: string) => void;
  onRemoveTag: (id: string, tags: string[] | null, tag: string) => void;
  formatCurrency: (value: number) => string;
}

interface CategoryGroup {
  name: string;
  transactions: UnifiedTransaction[];
  total: number;
  paidTotal: number;
  pendingTotal: number;
}

export function TransacoesDRE({
  transactions,
  isLoading,
  onEdit,
  onDelete,
  onMarkAsPaid,
  onRemoveTag,
  formatCurrency,
}: TransacoesDREProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [receitasExpanded, setReceitasExpanded] = useState(true);
  const [despesasExpanded, setDespesasExpanded] = useState(true);

  // Group transactions by type and category
  const groupedData = useMemo(() => {
    const receitas: CategoryGroup[] = [];
    const despesas: CategoryGroup[] = [];
    
    // Group by category
    const receitasByCategory = new Map<string, UnifiedTransaction[]>();
    const despesasByCategory = new Map<string, UnifiedTransaction[]>();
    
    transactions.forEach(t => {
      const categoryName = t.categories?.name || 'Sem Categoria';
      const map = t.tipo === 'RECEBER' ? receitasByCategory : despesasByCategory;
      
      if (!map.has(categoryName)) {
        map.set(categoryName, []);
      }
      map.get(categoryName)!.push(t);
    });
    
    // Convert to CategoryGroup format
    receitasByCategory.forEach((transactions, name) => {
      const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const paidTotal = transactions.filter(t => t.status === 'PAGO').reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const pendingTotal = total - paidTotal;
      receitas.push({ name, transactions, total, paidTotal, pendingTotal });
    });
    
    despesasByCategory.forEach((transactions, name) => {
      const total = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const paidTotal = transactions.filter(t => t.status === 'PAGO').reduce((sum, t) => sum + Math.abs(t.amount), 0);
      const pendingTotal = total - paidTotal;
      despesas.push({ name, transactions, total, paidTotal, pendingTotal });
    });
    
    // Sort by total amount (descending)
    receitas.sort((a, b) => b.total - a.total);
    despesas.sort((a, b) => b.total - a.total);
    
    const totalReceitas = receitas.reduce((sum, g) => sum + g.total, 0);
    const totalDespesas = despesas.reduce((sum, g) => sum + g.total, 0);
    const totalReceitasPago = receitas.reduce((sum, g) => sum + g.paidTotal, 0);
    const totalDespesasPago = despesas.reduce((sum, g) => sum + g.paidTotal, 0);
    
    return {
      receitas,
      despesas,
      totalReceitas,
      totalDespesas,
      totalReceitasPago,
      totalDespesasPago,
      resultado: totalReceitas - totalDespesas,
    };
  }, [transactions]);

  const toggleCategory = (key: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedCategories(newExpanded);
  };

  const expandAll = () => {
    const allKeys = new Set<string>();
    groupedData.receitas.forEach(g => allKeys.add(`receita-${g.name}`));
    groupedData.despesas.forEach(g => allKeys.add(`despesa-${g.name}`));
    setExpandedCategories(allKeys);
    setReceitasExpanded(true);
    setDespesasExpanded(true);
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
    setReceitasExpanded(false);
    setDespesasExpanded(false);
  };

  const getStatusStyle = (status: string) => {
    if (status === 'PAGO') return 'bg-emerald-500 text-white';
    if (status === 'ATRASADO') return 'bg-destructive text-white';
    return 'bg-amber-500 text-white';
  };

  const getStatusLabel = (status: string) => {
    if (status === 'PAGO') return 'Pago';
    if (status === 'ATRASADO') return 'Atrasado';
    return 'Pendente';
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Carregando transações...
        </CardContent>
      </Card>
    );
  }

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhuma transação encontrada
        </CardContent>
      </Card>
    );
  }

  const renderTransactionRow = (t: UnifiedTransaction) => {
    const isReceita = t.tipo === 'RECEBER';
    const isPaid = t.status === 'PAGO';
    const isOverdue = t.status === 'ATRASADO';
    const tags = t.tags as string[] | null;

    return (
      <div
        key={t.id}
        className={cn(
          "flex items-center justify-between px-4 py-2 hover:bg-muted/30 transition-colors border-l-2 ml-6",
          isPaid ? "border-l-emerald-500/50" : isOverdue ? "border-l-destructive/50" : "border-l-amber-500/50"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            <p className="text-sm truncate">{t.description || 'Sem descrição'}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {format(new Date(t.due_date), 'dd/MM/yyyy')}
              </span>
              {t.total_installments && t.total_installments > 1 && (
                <Badge variant="outline" className="text-xs py-0 h-5 bg-amber-500/10 text-amber-700 border-amber-500/30">
                  {t.installment_number}/{t.total_installments}
                </Badge>
              )}
              {t.isCardTransaction && t.credit_cards?.name && (
                <Badge variant="secondary" className="text-xs py-0 h-5 gap-1">
                  <CreditCard className="h-3 w-3" />
                  {t.credit_cards.name}
                </Badge>
              )}
              {!t.isCardTransaction && (
                <Badge variant="secondary" className="text-xs py-0 h-5 gap-1">
                  {t.entities?.type === 'LOJA' ? (
                    <><Building2 className="h-3 w-3" /> Loja</>
                  ) : (
                    <><User className="h-3 w-3" /> Part.</>
                  )}
                </Badge>
              )}
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
                      onRemoveTag(t.id, tags, tag);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className={cn("text-xs", getStatusStyle(t.status))}>
            {getStatusLabel(t.status)}
          </Badge>
          <span className={cn(
            "text-sm font-semibold tabular-nums min-w-[100px] text-right",
            isReceita ? "text-emerald-600" : "text-destructive"
          )}>
            {isReceita ? '+' : '-'}{formatCurrency(Math.abs(t.amount))}
          </span>
          <div className="flex items-center gap-1">
            {!isPaid && !t.isCardTransaction && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100"
                      onClick={() => onMarkAsPaid(t.id)}
                    >
                      <Check className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Marcar como pago</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {!t.isCardTransaction && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => onEdit(t)}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive hover:text-destructive"
                  onClick={() => onDelete(t.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderCategoryGroup = (group: CategoryGroup, type: 'receita' | 'despesa') => {
    const key = `${type}-${group.name}`;
    const isExpanded = expandedCategories.has(key);
    const isReceita = type === 'receita';
    const paidPercentage = group.total > 0 ? (group.paidTotal / group.total) * 100 : 0;

    return (
      <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleCategory(key)}>
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors",
              "border-l-4",
              isReceita ? "border-l-emerald-500" : "border-l-destructive"
            )}
          >
            <div className="flex items-center gap-3">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">{group.name}</span>
              <Badge variant="secondary" className="text-xs">
                {group.transactions.length}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 w-32">
                <Progress value={paidPercentage} className="h-1.5" />
                <span className="text-xs text-muted-foreground w-8">
                  {Math.round(paidPercentage)}%
                </span>
              </div>
              <span className={cn(
                "font-semibold tabular-nums",
                isReceita ? "text-emerald-600" : "text-destructive"
              )}>
                {isReceita ? '+' : '-'}{formatCurrency(group.total)}
              </span>
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="bg-muted/20">
            {group.transactions
              .sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime())
              .map(renderTransactionRow)}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" size="sm" onClick={expandAll} className="gap-2">
          <ChevronsUpDown className="h-4 w-4" />
          Expandir Tudo
        </Button>
        <Button variant="outline" size="sm" onClick={collapseAll} className="gap-2">
          <ChevronsUpDown className="h-4 w-4 rotate-90" />
          Fechar Tudo
        </Button>
      </div>

      <Card className="overflow-hidden">
        <CardContent className="p-0">
          {/* RECEITAS Section */}
          <Collapsible open={receitasExpanded} onOpenChange={setReceitasExpanded}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-4 bg-emerald-500/10 hover:bg-emerald-500/15 transition-colors">
                <div className="flex items-center gap-3">
                  {receitasExpanded ? (
                    <ChevronDown className="h-5 w-5 text-emerald-600" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-emerald-600" />
                  )}
                  <TrendingUp className="h-5 w-5 text-emerald-600" />
                  <span className="text-lg font-semibold text-emerald-700">RECEITAS</span>
                  <Badge variant="secondary" className="text-xs bg-emerald-500/20 text-emerald-700">
                    {groupedData.receitas.reduce((sum, g) => sum + g.transactions.length, 0)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:block text-right">
                    <span className="text-xs text-muted-foreground">
                      Recebido: {formatCurrency(groupedData.totalReceitasPago)}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-emerald-600 tabular-nums">
                    +{formatCurrency(groupedData.totalReceitas)}
                  </span>
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="divide-y">
                {groupedData.receitas.map(group => renderCategoryGroup(group, 'receita'))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* DESPESAS Section */}
          <Collapsible open={despesasExpanded} onOpenChange={setDespesasExpanded}>
            <CollapsibleTrigger asChild>
              <button className="w-full flex items-center justify-between px-4 py-4 bg-destructive/10 hover:bg-destructive/15 transition-colors border-t">
                <div className="flex items-center gap-3">
                  {despesasExpanded ? (
                    <ChevronDown className="h-5 w-5 text-destructive" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-destructive" />
                  )}
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  <span className="text-lg font-semibold text-red-700">DESPESAS</span>
                  <Badge variant="secondary" className="text-xs bg-destructive/20 text-red-700">
                    {groupedData.despesas.reduce((sum, g) => sum + g.transactions.length, 0)}
                  </Badge>
                </div>
                <div className="flex items-center gap-4">
                  <div className="hidden sm:block text-right">
                    <span className="text-xs text-muted-foreground">
                      Pago: {formatCurrency(groupedData.totalDespesasPago)}
                    </span>
                  </div>
                  <span className="text-lg font-bold text-destructive tabular-nums">
                    -{formatCurrency(groupedData.totalDespesas)}
                  </span>
                </div>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="divide-y">
                {groupedData.despesas.map(group => renderCategoryGroup(group, 'despesa'))}
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* RESULTADO */}
          <div className={cn(
            "flex items-center justify-between px-4 py-4 border-t-2",
            groupedData.resultado >= 0 ? "bg-emerald-500/5 border-t-emerald-500" : "bg-destructive/5 border-t-destructive"
          )}>
            <div className="flex items-center gap-3">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center",
                groupedData.resultado >= 0 ? "bg-emerald-500/20" : "bg-destructive/20"
              )}>
                {groupedData.resultado >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-emerald-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </div>
              <span className="text-lg font-bold">RESULTADO</span>
            </div>
            <span className={cn(
              "text-xl font-bold tabular-nums",
              groupedData.resultado >= 0 ? "text-emerald-600" : "text-destructive"
            )}>
              {groupedData.resultado >= 0 ? '+' : ''}{formatCurrency(groupedData.resultado)}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
