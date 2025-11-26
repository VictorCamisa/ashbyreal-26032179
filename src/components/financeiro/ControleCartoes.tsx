import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, CreditCard } from 'lucide-react';
import { useCartoes } from '@/hooks/useCartoes';
import { useCartoesMutations } from '@/hooks/useCartoesMutations';
import { Badge } from '@/components/ui/badge';
import { NovoCartaoDialog } from './NovoCartaoDialog';

export function ControleCartoes() {
  const { cartoes, faturas, isLoading } = useCartoes();
  const { createCartao, isCreating } = useCartoesMutations();
  const [showNovoCartao, setShowNovoCartao] = useState(false);

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
        <Button onClick={() => setShowNovoCartao(true)} size="lg">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cartão
        </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>Faturas Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {faturas && faturas.length > 0 ? (
            <div className="space-y-3">
              {faturas.map((fatura) => (
                <div key={fatura.id} className="flex justify-between items-center p-3 border rounded-lg">
                  <div>
                    <p className="font-semibold">{fatura.competencia}</p>
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
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">Nenhuma fatura encontrada.</p>
          )}
        </CardContent>
      </Card>

      <NovoCartaoDialog
        open={showNovoCartao}
        onOpenChange={setShowNovoCartao}
        onSave={(card) => {
          createCartao(card);
          setShowNovoCartao(false);
        }}
        isLoading={isCreating}
      />
    </div>
  );
}
