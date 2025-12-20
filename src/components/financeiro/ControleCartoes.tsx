import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  FileText
} from 'lucide-react';
import { useCartoes } from '@/hooks/useCartoes';
import { useCartoesMutations } from '@/hooks/useCartoesMutations';
import { useFaturasMutations } from '@/hooks/useFaturasMutations';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';
import { Badge } from '@/components/ui/badge';
import { NovoCartaoDialog } from './NovoCartaoDialog';
import { NovaFaturaDialog } from './NovaFaturaDialog';
import { NovoGastoCartaoDialog } from './NovoGastoCartaoDialog';
import { ImportarFaturaCartaoDialog } from './ImportarFaturaCartaoDialog';
import { DetalhesCartaoSheet } from './DetalhesCartaoSheet';
import { CartaoAlerts } from './CartaoAlerts';
import { TodasFaturasSheet } from './TodasFaturasSheet';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function ControleCartoes() {
  const { cartoes, faturas, transacoesPorCartao, isLoading } = useCartoes();
  const { createCartao, isCreating } = useCartoesMutations();
  const { createFatura, isCreating: isCreatingFatura } = useFaturasMutations();
  const { createGasto, isCreating: isCreatingGasto } = useGastosCartaoMutations();
  const [showNovoCartao, setShowNovoCartao] = useState(false);
  const [showNovaFatura, setShowNovaFatura] = useState(false);
  const [showNovoGasto, setShowNovoGasto] = useState(false);
  const [showImportarFatura, setShowImportarFatura] = useState(false);
  const [showTodasFaturas, setShowTodasFaturas] = useState(false);
  const [selectedCard, setSelectedCard] = useState<any>(null);

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

      {/* Action Bar */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => setShowNovoGasto(true)} className="gap-2">
          <ShoppingCart className="h-4 w-4" />
          Lançar Gasto
        </Button>
        <Button onClick={() => setShowImportarFatura(true)} variant="default" className="gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600">
          <Upload className="h-4 w-4" />
          Importar Fatura
        </Button>
        <Button onClick={() => setShowTodasFaturas(true)} variant="secondary" className="gap-2">
          <FileText className="h-4 w-4" />
          Ver Faturas
        </Button>
        <Button onClick={() => setShowNovaFatura(true)} variant="outline" className="gap-2">
          <Receipt className="h-4 w-4" />
          Nova Fatura
        </Button>
        <Button onClick={() => setShowNovoCartao(true)} variant="outline" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cartão
        </Button>
      </div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {cartoes.map((cartao) => {
              const currentValue = getCardCurrentValue(cartao.id);
              const usedLimit = currentValue;
              const limitValue = cartao.limit_value || 0;
              const usagePercent = limitValue > 0 ? (usedLimit / limitValue) * 100 : 0;
              const isHighUsage = usagePercent > 80;
              
              return (
                <Card 
                  key={cartao.id} 
                  className={cn(
                    "glass-card cursor-pointer transition-all hover:shadow-lg group",
                    !cartao.is_active && "opacity-60"
                  )}
                  onClick={() => setSelectedCard(cartao)}
                >
                  <CardContent className="p-4">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center",
                          cartao.is_active ? "bg-gradient-to-br from-primary to-primary/70" : "bg-muted"
                        )}>
                          <CreditCard className="h-6 w-6 text-primary-foreground" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{cartao.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Venc. dia {cartao.due_day || '-'} • Fecha dia {cartao.closing_day || '-'}
                          </p>
                        </div>
                      </div>
                      <Badge variant={cartao.is_active ? 'default' : 'secondary'} className="text-xs">
                        {cartao.is_active ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    {/* Limit Usage */}
                    {limitValue > 0 && (
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Limite usado</span>
                          <span className={cn(
                            "font-medium",
                            isHighUsage ? "text-destructive" : ""
                          )}>
                            {usagePercent.toFixed(0)}%
                          </span>
                        </div>
                        <Progress 
                          value={Math.min(usagePercent, 100)} 
                          className={cn(
                            "h-2",
                            isHighUsage && "[&>div]:bg-destructive"
                          )}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>R$ {usedLimit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          <span>R$ {limitValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    )}

                    {/* Current Fatura Info */}
                    {currentValue > 0 && (
                      <div className="pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Fatura Atual</span>
                          </div>
                          <span className="font-semibold">
                            R$ {currentValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
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
                                    {competenciaDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
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
    </div>
  );
}
