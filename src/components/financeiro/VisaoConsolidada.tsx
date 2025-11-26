import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useFinanceiro } from '@/hooks/useFinanceiro';
import { TrendingUp, Building2, User } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function VisaoConsolidada() {
  const [referenceMonth, setReferenceMonth] = useState(new Date().toISOString().slice(0, 7));
  
  const { dashboardData: lojaData } = useFinanceiro('LOJA', referenceMonth);
  const { dashboardData: particularData } = useFinanceiro('PARTICULAR', referenceMonth);

  const lojaDespesas = lojaData?.totalDespesas || 0;
  const particularDespesas = particularData?.totalDespesas || 0;
  const totalGeral = lojaDespesas + particularDespesas;
  const percentualParticular = totalGeral > 0 ? (particularDespesas / totalGeral) * 100 : 0;

  const dadosComparacao = [
    {
      categoria: 'Despesas',
      Loja: lojaDespesas,
      Particular: particularDespesas
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Visão Consolidada: Loja x Particular</h2>
        <input
          type="month"
          value={referenceMonth}
          onChange={(e) => setReferenceMonth(e.target.value)}
          className="px-3 py-2 border rounded-md"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Loja</CardTitle>
            <Building2 className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {lojaDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas Particulares</CardTitle>
            <User className="h-4 w-4 text-secondary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {particularDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">% Particular sobre Total</CardTitle>
            <TrendingUp className="h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {percentualParticular.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total: R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Despesas</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={dadosComparacao}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="categoria" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="Loja" fill="#8884d8" />
              <Bar dataKey="Particular" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}
