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
    <div className="space-y-6">
      {/* Alerts */}
      {cartoes && faturas && (
        <CartaoAlerts cartoes={cartoes} faturas={faturas} />
      )}

      {/* View Mode Tabs + Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'analytics' | 'cards' | 'despesas')} className="w-auto">
          <TabsList>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="cards" className="gap-2">
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">Cartões</span>
            </TabsTrigger>
            <TabsTrigger value="despesas" className="gap-2">
              <Repeat className="h-4 w-4" />
              <span className="hidden sm:inline">Despesas Fixas</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Action Bar */}
        <div className="flex flex-wrap gap-2">
          {viewMode !== 'despesas' && (
            <>
              <Button onClick={() => setShowNovoGasto(true)} className="gap-2" size="sm">
                <ShoppingCart className="h-4 w-4" />
                <span className="hidden sm:inline">Lançar Gasto</span>
              </Button>
              <Button onClick={() => setShowImportarFatura(true)} variant="success" size="sm" className="gap-2">
                <Upload className="h-4 w-4" />
                <span className="hidden sm:inline">Importar Fatura</span>
              </Button>
              <Button onClick={() => setShowTodasFaturas(true)} variant="secondary" size="sm" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Ver Faturas</span>
              </Button>
              <Button onClick={() => setShowPluggyConnect(true)} variant="outline" size="sm" className="gap-2 border-primary/30 text-primary">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Pluggy</span>
              </Button>
              <Button onClick={() => setShowNovoCartao(true)} variant="outline" size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Novo Cartão</span>
              </Button>
            </>
          )}
        </div>
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="glass-card border-l-4 border-l-primary">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Faturas em Aberto</p>
                <p className="text-2xl font-bold mt-1">
                  R$ {totalFaturasAbertas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {faturasAbertas.length} {faturasAbertas.length === 1 ? 'fatura' : 'faturas'}
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-amber-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Próximos 6 Meses</p>
                <p className="text-2xl font-bold mt-1">
                  R$ {totalProximos6Meses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Gastos previstos
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-l-4 border-l-emerald-500">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Cartões Ativos</p>
                <p className="text-2xl font-bold mt-1">
                  {cartoes?.filter(c => c.is_active).length || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  de {cartoes?.length || 0} cadastrados
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards Grid */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Meus Cartões</h3>
        {cartoes && cartoes.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
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
          <Card className="glass-card">
            <CardContent className="p-8 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground mb-4">Nenhum cartão cadastrado</p>
              <Button onClick={() => setShowNovoCartao(true)} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Cadastrar Cartão
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Faturas por Cartão */}
      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            Faturas por Cartão
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
