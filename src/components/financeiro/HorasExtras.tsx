import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Clock, UserPlus } from 'lucide-react';
import { useHorasExtras } from '@/hooks/useHorasExtras';
import { useTimesheetMutations } from '@/hooks/useTimesheetMutations';
import { useFuncionariosMutations } from '@/hooks/useFuncionariosMutations';
import { LancarPontoDialog } from './LancarPontoDialog';
import { NovoFuncionarioDialog } from './NovoFuncionarioDialog';

export function HorasExtras() {
  const [referenceMonth, setReferenceMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showLancarPonto, setShowLancarPonto] = useState(false);
  const [showNovoFuncionario, setShowNovoFuncionario] = useState(false);
  
  const { funcionarios, resumos, isLoading } = useHorasExtras(referenceMonth);
  const { createEntry, isCreating } = useTimesheetMutations();
  const { createFuncionario, isCreating: isCreatingFuncionario } = useFuncionariosMutations();

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
        <div className="flex items-center gap-2">
          <Clock className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">Controle de Horas Extras</h2>
            <p className="text-sm text-muted-foreground">Registro de ponto e horas extras</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowNovoFuncionario(true)} size="lg" variant="outline">
            <UserPlus className="h-4 w-4 mr-2" />
            Novo Funcionário
          </Button>
          <Button onClick={() => setShowLancarPonto(true)} size="lg">
            <Plus className="h-4 w-4 mr-2" />
            Lançar Ponto
          </Button>
        </div>
      </div>

      <div>
        <input
          type="month"
          value={referenceMonth}
          onChange={(e) => setReferenceMonth(e.target.value)}
          className="px-3 py-2 border rounded-md bg-background"
        />
      </div>

      {resumos && resumos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resumos.map((resumo) => {
            const funcionario = funcionarios?.find(f => f.id === resumo.employee_id);
            
            return (
              <Card key={resumo.id}>
                <CardHeader>
                  <CardTitle>{funcionario?.name || 'Funcionário'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground">Horas Extras:</span>
                    <span className="font-semibold text-green-600">{resumo.horas_extras}h</span>
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
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Nenhum registro encontrado para este mês.</p>
          </CardContent>
        </Card>
      )}

      <LancarPontoDialog
        open={showLancarPonto}
        onOpenChange={setShowLancarPonto}
        onSave={(entry) => {
          createEntry(entry);
          setShowLancarPonto(false);
        }}
        isLoading={isCreating}
        referenceMonth={referenceMonth}
      />

      <NovoFuncionarioDialog
        open={showNovoFuncionario}
        onOpenChange={setShowNovoFuncionario}
        onSave={(employee) => {
          createFuncionario(employee);
          setShowNovoFuncionario(false);
        }}
        isLoading={isCreatingFuncionario}
      />
    </div>
  );
}
