import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard, Receipt, ShoppingCart } from 'lucide-react';
import { useCartoes } from '@/hooks/useCartoes';
import { useCartoesMutations } from '@/hooks/useCartoesMutations';
import { useFaturasMutations } from '@/hooks/useFaturasMutations';
import { useGastosCartaoMutations } from '@/hooks/useGastosCartaoMutations';
import { Badge } from '@/components/ui/badge';
import { NovoCartaoDialog } from './NovoCartaoDialog';
import { NovaFaturaDialog } from './NovaFaturaDialog';
import { NovoGastoCartaoDialog } from './NovoGastoCartaoDialog';

export function ControleCartoes() {
  const { cartoes, faturas, isLoading } = useCartoes();
  const { createCartao, isCreating } = useCartoesMutations();
  const { createFatura, isCreating: isCreatingFatura } = useFaturasMutations();
  const { createGasto, isCreating: isCreatingGasto } = useGastosCartaoMutations();
  const [showNovoCartao, setShowNovoCartao] = useState(false);
  const [showNovaFatura, setShowNovaFatura] = useState(false);
  const [showNovoGasto, setShowNovoGasto] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Controle de Cartões</h2>
          <p className="text-sm text-muted-foreground">Gerencie seus cartões de crédito</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNovoGasto(true)} size="lg" variant="outline">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Novo Gasto
          </Button>
          <Button onClick={() => setShowNovaFatura(true)} size="lg" variant="outline">
            <Receipt className="h-4 w-4 mr-2" />
            Nova Fatura
          </Button>
          <Button onClick={() => setShowNovoCartao(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Novo Cartão
          </Button>
        </div>
      </div>

      {cartoes && cartoes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {cartoes.map((cartao) => (
            <Card key={cartao.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  {cartao.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Limite:</span>
                  <span className="font-semibold">
                    R$ {cartao.limit_value?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Fechamento:</span>
                  <span>Dia {cartao.closing_day || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Vencimento:</span>
                  <span>Dia {cartao.due_day || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <Badge variant={cartao.is_active ? 'default' : 'secondary'}>
                    {cartao.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum cartão cadastrado.</p>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Faturas Recentes e Previstas</CardTitle>
          </CardHeader>
          <CardContent>
            {faturas && faturas.length > 0 ? (
              <div className="space-y-3">
                {faturas.map((fatura) => {
                  const competenciaDate = new Date(fatura.competencia);
                  const now = new Date();
                  const isFuture = competenciaDate > now;
                  
                  return (
                    <div key={fatura.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div>
                        <p className="font-semibold">
                          {new Date(fatura.competencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                          {isFuture && <span className="text-xs text-muted-foreground ml-2">(Previsto)</span>}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Vencimento: {fatura.due_date ? new Date(fatura.due_date).toLocaleDateString('pt-BR') : '-'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">
                          R$ {fatura.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                        <Badge variant={
                          fatura.status === 'PAGA' ? 'default' : 
                          fatura.status === 'ABERTA' ? 'secondary' : 
                          'destructive'
                        }>
                          {fatura.status}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">Nenhuma fatura encontrada.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Resumo de Gastos Futuros</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {faturas && faturas.filter(f => {
                const competenciaDate = new Date(f.competencia);
                const now = new Date();
                return competenciaDate >= now;
              }).slice(0, 6).map((fatura) => (
                <div key={fatura.id} className="flex justify-between items-center p-2 border-b">
                  <span className="text-sm">
                    {new Date(fatura.competencia).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
                  </span>
                  <span className="font-semibold">
                    R$ {fatura.total_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              ))}
              {(!faturas || faturas.filter(f => new Date(f.competencia) >= new Date()).length === 0) && (
                <p className="text-center text-muted-foreground py-4">Nenhum gasto previsto.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

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
    </div>
  );
}
