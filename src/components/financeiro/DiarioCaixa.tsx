import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Search, 
  Upload, 
  Filter,
  ArrowUpCircle,
  ArrowDownCircle,
  Building2,
  User,
  CalendarDays
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ImportarTransacoesDialog } from './ImportarTransacoesDialog';
import { cn } from '@/lib/utils';

export function DiarioCaixa() {
  const [searchTerm, setSearchTerm] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('todos');
  const [entityFilter, setEntityFilter] = useState<string>('todos');
  const [showImport, setShowImport] = useState(false);

  // Fetch all transactions with related data
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['diario-caixa'],
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
        .order('due_date', { ascending: false })
        .limit(500);

      if (error) throw error;
      return data;
    }
  });

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
      
      return matchesSearch && matchesTipo && matchesEntity;
    });
  }, [transactions, searchTerm, tipoFilter, entityFilter]);

  // Calculate totals
  const totals = useMemo(() => {
    const receitas = filteredTransactions
      .filter(t => t.tipo === 'RECEBER')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const despesas = filteredTransactions
      .filter(t => t.tipo === 'PAGAR')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    return { receitas, despesas, saldo: receitas - despesas };
  }, [filteredTransactions]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-[250px]"
            />
          </div>
          
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="RECEBER">Receitas</SelectItem>
              <SelectItem value="PAGAR">Despesas</SelectItem>
            </SelectContent>
          </Select>

          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas</SelectItem>
              <SelectItem value="LOJA">Loja</SelectItem>
              <SelectItem value="PARTICULAR">Particular</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setShowImport(true)} className="gap-2">
          <Upload className="h-4 w-4" />
          Importar CSV
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-4 rounded-xl">
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
        </div>

        <div className="glass-card p-4 rounded-xl">
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
        </div>

        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2 rounded-lg",
              totals.saldo >= 0 ? "bg-emerald-500/10" : "bg-destructive/10"
            )}>
              <CalendarDays className={cn(
                "h-5 w-5",
                totals.saldo >= 0 ? "text-emerald-600" : "text-destructive"
              )} />
            </div>
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
        </div>
      </div>

      {/* Transactions Table */}
      <div className="glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-border/50">
              <TableHead className="w-[100px]">Tipo</TableHead>
              <TableHead className="w-[100px]">Data</TableHead>
              <TableHead className="w-[120px]">Valor</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Conta</TableHead>
              <TableHead>Subcategoria</TableHead>
              <TableHead className="w-[100px]">Entidade</TableHead>
              <TableHead className="w-[100px]">Competência</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Carregando transações...
                </TableCell>
              </TableRow>
            ) : filteredTransactions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  Nenhuma transação encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredTransactions.map((transaction) => (
                <TableRow key={transaction.id} className="border-b border-border/30 hover:bg-muted/30">
                  <TableCell>
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-xs",
                        transaction.tipo === 'RECEBER' 
                          ? "border-emerald-500/50 text-emerald-600 bg-emerald-500/10" 
                          : "border-destructive/50 text-destructive bg-destructive/10"
                      )}
                    >
                      {transaction.tipo === 'RECEBER' ? 'Receita' : 'Despesa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm">
                    {format(new Date(transaction.due_date), 'dd/MM/yyyy')}
                  </TableCell>
                  <TableCell className={cn(
                    "font-medium",
                    transaction.tipo === 'RECEBER' ? "text-emerald-600" : "text-destructive"
                  )}>
                    {formatCurrency(Number(transaction.amount))}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-sm">
                    {transaction.description || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.categories?.name || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.accounts?.name || '-'}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.subcategories?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs gap-1">
                      {transaction.entities?.type === 'LOJA' ? (
                        <><Building2 className="h-3 w-3" /> Loja</>
                      ) : (
                        <><User className="h-3 w-3" /> Particular</>
                      )}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {transaction.reference_month 
                      ? format(new Date(transaction.reference_month), 'MM/yyyy')
                      : '-'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ImportarTransacoesDialog 
        open={showImport} 
        onOpenChange={setShowImport} 
      />
    </div>
  );
}
