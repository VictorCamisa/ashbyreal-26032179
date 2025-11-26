import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Clock } from 'lucide-react';
import { useHorasExtras } from '@/hooks/useHorasExtras';
import { Badge } from '@/components/ui/badge';

export function HorasExtras() {
  const [referenceMonth, setReferenceMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const { funcionarios, resumos, isLoading } = useHorasExtras(referenceMonth);

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6" />
          <h2 className="text-2xl font-bold">Controle de Horas Extras</h2>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Lançar Ponto
        </Button>
      </div>

      <div>
        <input
          type="month"
          value={referenceMonth}
          onChange={(e) => setReferenceMonth(e.target.value)}
          className="px-3 py-2 border rounded-md"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {resumos?.map((resumo) => {
          const funcionario = funcionarios?.find(f => f.id === resumo.employee_id);
          
          return (
            <Card key={resumo.id}>
              <CardHeader>
                <CardTitle>{funcionario?.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Horas Extras:</span>
                  <span className="font-semibold">{resumo.horas_extras}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Faltas:</span>
                  <span className="font-semibold text-destructive">{resumo.horas_faltas}h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Banco de Horas:</span>
                  <span className="font-semibold">{resumo.saldo_banco_horas}h</span>
                </div>
                <div className="flex justify-between pt-2 border-t">
                  <span className="text-sm font-medium">Valor a Pagar:</span>
                  <span className="font-bold text-green-600">
                    R$ {resumo.valor_extras.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <Button 
                  className="w-full mt-2" 
                  variant={resumo.transaction_pagamento_id ? 'secondary' : 'default'}
                  disabled={!!resumo.transaction_pagamento_id}
                >
                  {resumo.transaction_pagamento_id ? 'Já Pago' : 'Gerar Pagamento'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
