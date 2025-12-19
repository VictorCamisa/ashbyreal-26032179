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
  Upload
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
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export function ControleCartoes() {
  const { cartoes, faturas, isLoading } = useCartoes();
  const { createCartao, isCreating } = useCartoesMutations();
  const { createFatura, isCreating: isCreatingFatura } = useFaturasMutations();
  const { createGasto, isCreating: isCreatingGasto } = useGastosCartaoMutations();
  const [showNovoCartao, setShowNovoCartao] = useState(false);
  const [showNovaFatura, setShowNovaFatura] = useState(false);
  const [showNovoGasto, setShowNovoGasto] = useState(false);
  const [showImportarFatura, setShowImportarFatura] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

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

  const getCardCurrentFatura = (cardId: string) => {
    const cardFaturas = getCardFaturas(cardId);
    return cardFaturas.find(f => f.competencia.startsWith(currentMonth));
  };

  return (
    <div className="space-y-6">
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
              const currentFatura = getCardCurrentFatura(cartao.id);
              const usedLimit = currentFatura?.total_value || 0;
              const limitValue = cartao.limit_value || 0;
              const usagePercent = limitValue > 0 ? (usedLimit / limitValue) * 100 : 0;
              const isHighUsage = usagePercent > 80;
              
              return (
                <Card 
                  key={cartao.id} 
                  className={cn(
                    "glass-card cursor-pointer transition-all hover:shadow-lg group",
                    selectedCardId === cartao.id && "ring-2 ring-primary",
                    !cartao.is_active && "opacity-60"
                  )}
                  onClick={() => setSelectedCardId(selectedCardId === cartao.id ? null : cartao.id)}
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
                    {currentFatura && (
                      <div className="pt-3 border-t border-border/50">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">Fatura Atual</span>
                          </div>
                          <span className="font-semibold">
                            R$ {currentFatura.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

      {/* Faturas Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faturas Abertas */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Faturas Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {faturasAbertas.length > 0 ? (
              faturasAbertas.slice(0, 5).map((fatura) => {
                const cartao = cartoes?.find(c => c.id === fatura.credit_card_id);
                const isOverdue = fatura.due_date && new Date(fatura.due_date) < now && fatura.status !== 'PAGA';
                
                return (
                  <div 
                    key={fatura.id} 
                    className={cn(
                      "flex items-center justify-between p-3 rounded-lg border transition-colors",
                      isOverdue ? "bg-destructive/5 border-destructive/20" : "bg-muted/30 border-border/50 hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center",
                        isOverdue ? "bg-destructive/10" : "bg-primary/10"
                      )}>
                        <CreditCard className={cn(
                          "h-4 w-4",
                          isOverdue ? "text-destructive" : "text-primary"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{cartao?.name || 'Cartão'}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(fatura.competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        R$ {fatura.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                      <Badge 
                        variant={isOverdue ? 'destructive' : fatura.status === 'FECHADA' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {isOverdue ? 'Vencida' : fatura.status}
                      </Badge>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-6">
                <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-500 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhuma fatura pendente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Próximas Faturas */}
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Próximas Faturas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {faturasFuturas.length > 0 ? (
              <div className="space-y-2">
                {faturasFuturas.map((fatura, index) => {
                  const cartao = cartoes?.find(c => c.id === fatura.credit_card_id);
                  
                  return (
                    <div 
                      key={fatura.id} 
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-muted/50 flex items-center justify-center text-sm font-medium text-muted-foreground">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{cartao?.name || 'Cartão'}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(fatura.competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <p className="font-semibold">
                        R$ {fatura.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Calendar className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum gasto futuro previsto</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
