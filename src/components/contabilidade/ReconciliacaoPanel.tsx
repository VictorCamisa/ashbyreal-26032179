import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Scale, AlertTriangle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ReconciliacaoPanelProps {
  totalEntradas: number;
  totalSaidas: number;
  entradasComNF: number;
  saidasComNF: number;
  isLoading?: boolean;
}

export function ReconciliacaoPanel({
  totalEntradas,
  totalSaidas,
  entradasComNF,
  saidasComNF,
  isLoading
}: ReconciliacaoPanelProps) {
  const gapEntradas = totalEntradas - entradasComNF;
  const gapSaidas = totalSaidas - saidasComNF;
  const saldoFiscal = saidasComNF - entradasComNF;
  const coberturaEntradas = totalEntradas > 0 ? (entradasComNF / totalEntradas) * 100 : 100;
  const coberturaSaidas = totalSaidas > 0 ? (saidasComNF / totalSaidas) * 100 : 100;

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Scale className="h-5 w-5" />
            Reconciliação Fiscal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Scale className="h-5 w-5" />
          Reconciliação Fiscal do Mês
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Entradas (Compras/Despesas) */}
          <div className="space-y-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">Entradas (Despesas)</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Boletos:</span>
                <span className="font-medium">{formatCurrency(totalEntradas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Com NF-e:</span>
                <span className="font-medium text-green-600">{formatCurrency(entradasComNF)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Gap (sem NF):</span>
                <span className={`font-bold ${gapEntradas > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {formatCurrency(gapEntradas)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${coberturaEntradas}%` }}
                />
              </div>
              <Badge variant={coberturaEntradas >= 90 ? 'default' : coberturaEntradas >= 70 ? 'secondary' : 'destructive'}>
                {formatPercent(coberturaEntradas)}
              </Badge>
            </div>
          </div>

          {/* Saldo Central */}
          <div className="space-y-4 p-4 rounded-lg bg-primary/10 border border-primary/20 flex flex-col justify-center items-center">
            <h3 className="font-semibold text-center">Saldo Fiscal</h3>
            <div className={`text-3xl font-bold ${saldoFiscal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldoFiscal)}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Saídas (vendas) - Entradas (compras)
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              {saldoFiscal >= 0 ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">Resultado Positivo</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-600">Verificar Operações</span>
                </>
              )}
            </div>
          </div>

          {/* Saídas (Vendas) */}
          <div className="space-y-4 p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-500" />
              <h3 className="font-semibold">Saídas (Vendas)</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Pedidos:</span>
                <span className="font-medium">{formatCurrency(totalSaidas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Com NF/Cupom:</span>
                <span className="font-medium text-green-600">{formatCurrency(saidasComNF)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Gap (sem NF):</span>
                <span className={`font-bold ${gapSaidas > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {formatCurrency(gapSaidas)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${coberturaSaidas}%` }}
                />
              </div>
              <Badge variant={coberturaSaidas >= 90 ? 'default' : coberturaSaidas >= 70 ? 'secondary' : 'destructive'}>
                {formatPercent(coberturaSaidas)}
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
