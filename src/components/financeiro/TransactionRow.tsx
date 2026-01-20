import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import {
  ArrowUpCircle,
  ArrowDownCircle,
  Building2,
  User,
  Pencil,
  Trash2,
  Check,
  Tag,
  X,
  CreditCard,
  Repeat,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface TransactionRowProps {
  transaction: {
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
    isCardTransaction?: boolean;
    isFaturaCartao?: boolean;
  };
  isSelected: boolean;
  onToggleSelection: () => void;
  onMarkAsPaid: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRecurring: () => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  allTags: string[];
  isMarkingPaid?: boolean;
  formatCurrency: (value: number) => string;
  getCategoryColor: (group: string | null) => string;
  getStatusStyle: (status: string, isOverdue: boolean) => string;
  getStatusLabel: (status: string, isOverdue: boolean) => string;
}

export function TransactionRow({
  transaction: t,
  isSelected,
  onToggleSelection,
  onMarkAsPaid,
  onEdit,
  onDelete,
  onRecurring,
  onAddTag,
  onRemoveTag,
  allTags,
  isMarkingPaid,
  formatCurrency,
  getCategoryColor,
  getStatusStyle,
  getStatusLabel,
}: TransactionRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isReceita = t.tipo === 'RECEBER';
  const isOverdue = t.status === 'ATRASADO' || 
    (t.status === 'PREVISTO' && new Date(t.due_date) < new Date());
  const isPaid = t.status === 'PAGO';
  const tags = t.tags as string[] | null;
  const isFaturaCartao = t.isFaturaCartao || t.origin === 'FATURA_CARTAO';

  // Fetch card transactions when expanded
  const { data: cardTransactions, isLoading: isLoadingCardTx } = useQuery({
    queryKey: ['fatura-transactions', t.origin_reference_id],
    queryFn: async () => {
      if (!t.origin_reference_id) return [];
      
      // Get invoice details first
      const { data: invoice, error: invoiceError } = await supabase
        .from('credit_card_invoices')
        .select('credit_card_id, competencia')
        .eq('id', t.origin_reference_id)
        .single();

      if (invoiceError || !invoice) return [];

      // Get transactions for this invoice
      const { data, error } = await supabase
        .from('credit_card_transactions')
        .select(`
          id,
          description,
          amount,
          purchase_date,
          installment_number,
          total_installments,
          categories(name, group)
        `)
        .eq('credit_card_id', invoice.credit_card_id)
        .eq('competencia', invoice.competencia)
        .order('purchase_date', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: isExpanded && isFaturaCartao && !!t.origin_reference_id,
  });

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <div 
        className={cn(
          "flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors",
          isOverdue && !isPaid && "bg-destructive/5",
          isSelected && "bg-primary/5"
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onToggleSelection}
          />
          <div className={cn(
            "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
            isReceita ? "bg-emerald-500/10" : "bg-destructive/10"
          )}>
            {isReceita 
              ? <ArrowUpCircle className="h-4 w-4 text-emerald-600" />
              : <ArrowDownCircle className="h-4 w-4 text-destructive" />
            }
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{t.description || 'Sem descrição'}</p>
              {/* Expand button for credit card invoices */}
              {isFaturaCartao && t.origin_reference_id && (
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 px-2 gap-1">
                    <CreditCard className="h-3 w-3" />
                    <span className="text-xs">Ver lançamentos</span>
                    {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </Button>
                </CollapsibleTrigger>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <span className="text-xs text-muted-foreground">
                {format(new Date(t.due_date), 'dd/MM/yyyy')}
              </span>
              {t.categories?.name && (
                <Badge variant="outline" className={cn("text-xs py-0 h-5", getCategoryColor(t.categories.group))}>
                  {t.categories.name}
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
              {/* Recurring badge */}
              {t.origin === 'RECORRENTE' && (
                <Badge variant="outline" className="text-xs py-0 h-5 gap-1 bg-primary/10 text-primary border-primary/30">
                  <Repeat className="h-3 w-3" />
                  Recorrente
                </Badge>
              )}
              {/* Credit card invoice badge */}
              {isFaturaCartao && (
                <Badge variant="outline" className="text-xs py-0 h-5 gap-1 bg-primary/10 text-primary border-primary/30">
                  <CreditCard className="h-3 w-3" />
                  Fatura Cartão
                </Badge>
              )}
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
                      onRemoveTag(tag);
                    }}
                    className="ml-0.5 hover:text-destructive"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </Badge>
              ))}
              {/* Add tag input */}
              <TagInput 
                onAdd={onAddTag}
                suggestions={allTags}
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className={cn("text-xs", getStatusStyle(t.status, isOverdue))}>
            {getStatusLabel(t.status, isOverdue)}
          </Badge>
          <span className={cn(
            "text-sm font-semibold tabular-nums min-w-[100px] text-right",
            isReceita ? "text-emerald-600" : "text-destructive"
          )}>
            {isReceita ? '+' : '-'}{formatCurrency(Math.abs(Number(t.amount)))}
          </span>
          <div className="flex items-center gap-1">
            {/* Mark as paid button - only for non-card invoice transactions that aren't paid */}
            {!isPaid && !isFaturaCartao && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                      onClick={onMarkAsPaid}
                      disabled={isMarkingPaid}
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
            {/* Edit/Delete/Recurring - only for non-card transactions */}
            {!t.isCardTransaction && !isFaturaCartao && (
              <>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                        onClick={onRecurring}
                      >
                        <Repeat className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Tornar recorrente</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onEdit}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={onDelete}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Expandable card transactions */}
      <CollapsibleContent>
        {isFaturaCartao && (
          <div className="bg-muted/20 border-t border-b">
            {isLoadingCardTx ? (
              <div className="px-8 py-4 text-xs text-muted-foreground">
                Carregando lançamentos...
              </div>
            ) : cardTransactions && cardTransactions.length > 0 ? (
              <div className="divide-y divide-border/50">
                <div className="px-8 py-2 text-xs font-medium text-muted-foreground bg-muted/30">
                  {cardTransactions.length} lançamento(s) nesta fatura
                </div>
                {cardTransactions.map((tx: any) => (
                  <div 
                    key={tx.id}
                    className="flex items-center justify-between px-8 py-2 hover:bg-muted/30"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center">
                        <CreditCard className="h-3 w-3 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {tx.description}
                          {tx.total_installments && tx.total_installments > 1 && (
                            <span className="text-muted-foreground ml-1">
                              ({tx.installment_number}/{tx.total_installments})
                            </span>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(tx.purchase_date), 'dd/MM/yyyy')}
                          </span>
                          {tx.categories?.name && (
                            <Badge variant="outline" className={cn("text-xs py-0 h-4", getCategoryColor(tx.categories.group))}>
                              {tx.categories.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-destructive tabular-nums">
                      -{formatCurrency(Math.abs(Number(tx.amount)))}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-8 py-4 text-xs text-muted-foreground">
                Nenhum lançamento encontrado
              </div>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
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
      <input
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
        className="h-5 w-20 text-xs py-0 px-1 border rounded bg-background"
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
