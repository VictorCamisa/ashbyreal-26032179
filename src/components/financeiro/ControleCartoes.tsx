import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCardVisual } from './CreditCardVisual';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  CreditCard,
  Receipt,
  ShoppingCart,
  TrendingUp,
  Calendar,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Wallet,
  Upload,
  FileText,
  BarChart3,
  LayoutGrid,
  Repeat,
  Zap,
} from 'lucide-react';
import { useCartoes } from '@/hooks/useCartoes';
import { useCartoesMutations } from '@/hooks/useCartoesMutations';
import { useFaturasMutations } from '@/hooks/useFaturasMutations';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';
import { useRecurringExpenses, RecurringExpense } from '@/hooks/useRecurringExpenses';
import { Badge } from '@/components/ui/badge';
import { NovoCartaoDialog } from './NovoCartaoDialog';
import { NovaFaturaDialog } from './NovaFaturaDialog';
import { NovoGastoCartaoDialog } from './NovoGastoCartaoDialog';
import { ImportarFaturaCartaoDialog } from './ImportarFaturaCartaoDialog';
import { DetalhesCartaoSheet } from './DetalhesCartaoSheet';
import { CartaoAlerts } from './CartaoAlerts';
import { TodasFaturasSheet } from './TodasFaturasSheet';
import { CartoesAnalytics } from './CartoesAnalytics';
import { DespesasFixasAnalytics } from './DespesasFixasAnalytics';
import { NovaDespesaFixaDialog } from './NovaDespesaFixaDialog';
import { PluggyConnectDialog } from './PluggyConnectDialog';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function ControleCartoes() {
  const { cartoes, faturas, transacoesPorCartao, isLoading } = useCartoes();
  const { createCartao, isCreating } = useCartoesMutations();
  const { createFatura, isCreating: isCreatingFatura, syncMissingTransactions } = useFaturasMutations();
  const { createGasto, isCreating: isCreatingGasto } = useGastosCartaoMutations();
  const { expenses, createExpense, toggleActive, deleteExpense, isCreating: isCreatingExpense } = useRecurringExpenses();
  
  const [showNovoCartao, setShowNovoCartao] = useState(false);
  const [showNovaFatura, setShowNovaFatura] = useState(false);
  const [showNovoGasto, setShowNovoGasto] = useState(false);
  const [showImportarFatura, setShowImportarFatura] = useState(false);
  const [showTodasFaturas, setShowTodasFaturas] = useState(false);
  const [showNovaDespesaFixa, setShowNovaDespesaFixa] = useState(false);
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null);
  const [selectedCard, setSelectedCard] = useState<any>(null);
  const [showPluggyConnect, setShowPluggyConnect] = useState(false);
  const [viewMode, setViewMode] = useState<'analytics' | 'cards' | 'despesas'>('analytics');

  // Flag para evitar múltiplas sincronizações
  const hasSyncedRef = useRef(false);

  // Sincronizar faturas pendentes automaticamente na inicialização
  useEffect(() => {
    if (!isLoading && faturas && !hasSyncedRef.current) {
      const faturasNaoSincronizadas = faturas.filter(
        f => (f.status === 'FECHADA' || f.status === 'PAGA') && !f.transaction_id
      );
      
      if (faturasNaoSincronizadas.length > 0) {
        console.log(`Sincronizando ${faturasNaoSincronizadas.length} faturas pendentes...`);
        hasSyncedRef.current = true;
        syncMissingTransactions();
      }
    }
  }, [isLoading, faturas, syncMissingTransactions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-pulse text-muted-foreground">Carregando...</div>
      </div>
    );
  }

  // Calculate totals
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  
  const faturasAbertas = faturas?.filter(f => f.status === 'ABERTA' || f.status === 'FECHADA') || [];
  const totalFaturasAbertas = faturasAbertas.reduce((acc, f) => acc + f.total_value, 0);
  
  const faturasFuturas = faturas?.filter(f => {
    const competencia = new Date(f.competencia);
    return competencia > now;
  }).slice(0, 6) || [];
  
  const totalProximos6Meses = faturasFuturas.reduce((acc, f) => acc + f.total_value, 0);

  // Get card faturas
  const getCardFaturas = (cardId: string) => {
    return faturas?.filter(f => f.credit_card_id === cardId) || [];
  };

  // Pegar valor atual do cartão - usar transações ou fatura do mês
  const getCardCurrentValue = (cardId: string): number => {
    // Primeiro tentar das transações
    const fromTransactions = transacoesPorCartao?.get(cardId);
    if (fromTransactions && fromTransactions > 0) {
      return fromTransactions;
    }
    
    // Fallback para fatura do mês atual
    const cardFaturas = getCardFaturas(cardId);
    const currentFatura = cardFaturas.find(f => f.competencia.startsWith(currentMonth));
    return currentFatura?.total_value || 0;
  };

  return (
    <div className="space-y-5">
      {/* Alerts */}
      {cartoes && faturas && (
        <CartaoAlerts cartoes={cartoes} faturas={faturas} />
      )}

      {/* View Mode Tabs + Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'analytics' | 'cards' | 'despesas')} className="w-auto">
          <TabsList className="h-9">
            <TabsTrigger value="analytics" className="gap-1.5 text-xs px-3">
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-1.5 text-xs px-3">
              <LayoutGrid className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cartões</span>
            </TabsTrigger>
            <TabsTrigger value="despesas" className="gap-1.5 text-xs px-3">
              <Repeat className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Despesas Fixas</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Action Bar - cleaner with grouped actions */}
        {viewMode !== 'despesas' && (
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            <Button onClick={() => setShowNovoGasto(true)} size="sm" className="gap-1.5 shrink-0">
              <ShoppingCart className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lançar Gasto</span>
            </Button>
            <Button onClick={() => setShowImportarFatura(true)} variant="secondary" size="sm" className="gap-1.5 shrink-0">
              <Upload className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Importar</span>
            </Button>
            <Button onClick={() => setShowTodasFaturas(true)} variant="ghost" size="sm" className="gap-1.5 shrink-0">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Faturas</span>
            </Button>
            <Button onClick={() => setShowPluggyConnect(true)} variant="ghost" size="sm" className="gap-1.5 text-primary shrink-0">
              <Zap className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Pluggy</span>
            </Button>
            <Button onClick={() => setShowNovoCartao(true)} variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Analytics View */}
      {viewMode === 'analytics' && cartoes && faturas && (
        <CartoesAnalytics 
          cartoes={cartoes} 
          faturas={faturas} 
          onSelectCard={(c) => c && setSelectedCard(c)}
        />
      )}

      {/* Despesas Fixas View */}
      {viewMode === 'despesas' && (
        <DespesasFixasAnalytics
          expenses={expenses}
          onAddNew={() => {
            setEditingExpense(null);
            setShowNovaDespesaFixa(true);
          }}
          onEdit={(expense) => {
            setEditingExpense(expense);
            setShowNovaDespesaFixa(true);
          }}
          onToggleActive={(id, isActive) => toggleActive({ id, is_active: isActive })}
          onDelete={deleteExpense}
        />
      )}

      {/* Cards View */}
      {viewMode === 'cards' && (
        <>
          {/* Summary Strip */}
          <div className="grid grid-cols-3 gap-3">
            <Card className="border-l-2 border-l-primary">
              <CardContent className="p-3 sm:p-4">
                <p className="text-[11px] text-muted-foreground">Faturas em Aberto</p>
                <p className="text-lg sm:text-xl font-bold mt-0.5">
                  R$ {totalFaturasAbertas.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-muted-foreground">{faturasAbertas.length} fatura(s)</p>
              </CardContent>
            </Card>

            <Card className="border-l-2 border-l-amber-500">
              <CardContent className="p-3 sm:p-4">
                <p className="text-[11px] text-muted-foreground">Próx. 6 Meses</p>
                <p className="text-lg sm:text-xl font-bold mt-0.5">
                  R$ {totalProximos6Meses.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                </p>
                <p className="text-[10px] text-muted-foreground">Previstos</p>
              </CardContent>
            </Card>

            <Card className="border-l-2 border-l-emerald-500">
              <CardContent className="p-3 sm:p-4">
                <p className="text-[11px] text-muted-foreground">Cartões Ativos</p>
                <p className="text-lg sm:text-xl font-bold mt-0.5">
                  {cartoes?.filter(c => c.is_active).length || 0}
                </p>
                <p className="text-[10px] text-muted-foreground">de {cartoes?.length || 0}</p>
              </CardContent>
            </Card>
          </div>

          {/* Cards Grid */}
          <div>
            <h3 className="text-base font-semibold mb-3">Meus Cartões</h3>
            {cartoes && cartoes.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {cartoes.map((cartao) => {
                  const currentValue = getCardCurrentValue(cartao.id);
                  return (
                    <CreditCardVisual
                      key={cartao.id}
                      name={cartao.name}
                      lastDigits={cartao.last_digits}
                      brand={cartao.brand}
                      dueDay={cartao.due_day}
                      closingDay={cartao.closing_day}
                      isActive={cartao.is_active}
                      limitValue={cartao.limit_value}
                      currentValue={currentValue}
                      onClick={() => setSelectedCard(cartao)}
                    />
                  );
                })}
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <CreditCard className="h-10 w-10 mx-auto text-muted-foreground/40 mb-2" />
                  <p className="text-sm text-muted-foreground mb-3">Nenhum cartão cadastrado</p>
                  <Button onClick={() => setShowNovoCartao(true)} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1.5" />
                    Cadastrar Cartão
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

      {/* Faturas por Cartão */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Faturas Pendentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {cartoes && cartoes.length > 0 ? (
            <div className="space-y-6">
              {cartoes
                .filter(cartao => {
                  const cardFaturas = faturas?.filter(f => f.credit_card_id === cartao.id && (f.status === 'ABERTA' || f.status === 'FECHADA')) || [];
                  return cardFaturas.length > 0;
                })
                .map((cartao) => {
                  const cardFaturas = faturas
                    ?.filter(f => f.credit_card_id === cartao.id && (f.status === 'ABERTA' || f.status === 'FECHADA'))
                    .sort((a, b) => new Date(a.due_date || a.competencia).getTime() - new Date(b.due_date || b.competencia).getTime()) || [];
                  
                  const totalCartao = cardFaturas.reduce((acc, f) => acc + f.total_value, 0);
                  
                  return (
                    <div key={cartao.id} className="space-y-3">
                      {/* Card Header */}
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                            <CreditCard className="h-5 w-5 text-primary-foreground" />
                          </div>
                          <div>
                            <h4 className="font-semibold">{cartao.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              Venc. dia {cartao.due_day} • {cardFaturas.length} {cardFaturas.length === 1 ? 'fatura' : 'faturas'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">
                            R$ {totalCartao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                          <p className="text-xs text-muted-foreground">Total pendente</p>
                        </div>
                      </div>
                      
                      {/* Card Faturas */}
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 pl-2">
                        {cardFaturas.map((fatura, index) => {
                          const isOverdue = fatura.due_date && new Date(fatura.due_date) < now && fatura.status !== 'PAGA';
                          const competenciaDate = new Date(fatura.competencia);
                          const dueDateFormatted = fatura.due_date 
                            ? new Date(fatura.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
                            : null;
                          
                          return (
                            <div 
                              key={fatura.id} 
                              className={cn(
                                "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-border/50 hover:bg-muted/50"
                              )}
                            >
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "h-6 w-6 rounded flex items-center justify-center text-xs font-medium",
                                  isOverdue ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                                )}>
                                  {index + 1}
                                </div>
                                <div>
                                  <p className="text-sm font-medium capitalize">
                                    {competenciaDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')} {competenciaDate.toLocaleDateString('pt-BR', { year: '2-digit' })}
                                  </p>
                                  {dueDateFormatted && (
                                    <p className="text-xs text-muted-foreground">
                                      Venc: {dueDateFormatted}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-semibold text-sm">
                                  R$ {fatura.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-xs">
                                    Vencida
                                  </Badge>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <div className="text-center py-6">
              <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
              <p className="text-sm text-muted-foreground">Nenhuma fatura pendente</p>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {/* Dialogs */}
      <NovoCartaoDialog
        open={showNovoCartao}
        onOpenChange={setShowNovoCartao}
        onSave={(card) => {
          createCartao(card);
          setShowNovoCartao(false);
        }}
        isLoading={isCreating}
      />

      <NovaFaturaDialog
        open={showNovaFatura}
        onOpenChange={setShowNovaFatura}
        cartoes={cartoes || []}
        onSave={(invoice) => {
          createFatura(invoice);
          setShowNovaFatura(false);
        }}
        isLoading={isCreatingFatura}
      />

      <NovoGastoCartaoDialog
        open={showNovoGasto}
        onOpenChange={setShowNovoGasto}
        cartoes={cartoes || []}
        onSave={(gasto) => {
          createGasto(gasto);
          setShowNovoGasto(false);
        }}
        isLoading={isCreatingGasto}
      />

      <ImportarFaturaCartaoDialog
        open={showImportarFatura}
        onOpenChange={setShowImportarFatura}
        onSuccess={() => {
          // Refresh data
        }}
      />

      <DetalhesCartaoSheet
        open={!!selectedCard}
        onOpenChange={(open) => !open && setSelectedCard(null)}
        cartao={selectedCard}
      />

      <TodasFaturasSheet
        open={showTodasFaturas}
        onOpenChange={setShowTodasFaturas}
        faturas={faturas || []}
        cartoes={cartoes || []}
      />

      <NovaDespesaFixaDialog
        open={showNovaDespesaFixa}
        onOpenChange={(open) => {
          setShowNovaDespesaFixa(open);
          if (!open) setEditingExpense(null);
        }}
        editingExpense={editingExpense}
        onSave={(expense) => {
          createExpense(expense);
          setShowNovaDespesaFixa(false);
          setEditingExpense(null);
        }}
        isLoading={isCreatingExpense}
      />

      <PluggyConnectDialog
        open={showPluggyConnect}
        onOpenChange={setShowPluggyConnect}
      />
    </div>
  );
}
