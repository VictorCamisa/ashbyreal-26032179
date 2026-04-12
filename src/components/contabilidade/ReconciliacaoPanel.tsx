import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDownLeft, ArrowUpRight, Scale, AlertTriangle, CheckCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface ReconciliacaoPanelProps {
  // Entradas (Compras)
  entradasComNF: number;
  entradasSemNF: number;
  totalEntradas: number;
  // Saídas (Vendas)
  saidasComNFe: number;
  saidasComCupom: number;
  saidasSemNF: number;
  totalSaidas: number;
  // Gap
  gapFiscal: number;
  isLoading?: boolean;
}

export function ReconciliacaoPanel({
  entradasComNF,
  entradasSemNF,
  totalEntradas,
  saidasComNFe,
  saidasComCupom,
  saidasSemNF,
  totalSaidas,
  gapFiscal,
  isLoading
}: ReconciliacaoPanelProps) {
  const totalSaidasComNF = saidasComNFe + saidasComCupom;

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const coberturaEntradas = totalEntradas > 0 ? (entradasComNF / totalEntradas) * 100 : 100;
  const coberturaSaidas = totalSaidas > 0 ? (totalSaidasComNF / totalSaidas) * 100 : 100;

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
          {/* Entradas (Compras) */}
          <div className="space-y-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2">
              <ArrowDownLeft className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">Entradas (Compras)</h3>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Compras:</span>
                <span className="font-medium">{formatCurrency(totalEntradas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Com NF:</span>
                <span className="font-medium text-green-600">{formatCurrency(entradasComNF)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sem NF:</span>
                <span className={`font-bold ${entradasSemNF > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {formatCurrency(entradasSemNF)}
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
                {coberturaEntradas.toFixed(1)}%
              </Badge>
            </div>
          </div>

          {/* Gap Fiscal Central */}
          <div className="space-y-4 p-4 rounded-lg bg-primary/10 border border-primary/20 flex flex-col justify-center items-center">
            <h3 className="font-semibold text-center">Gap Fiscal</h3>
            <div className={`text-3xl font-bold ${gapFiscal <= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(Math.abs(gapFiscal))}
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Entradas c/ NF − Saídas c/ NF
            </p>
            
            <div className="flex items-center gap-2 mt-2">
              {gapFiscal <= 0 ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-green-600">
                    {gapFiscal === 0 ? 'Equilibrado' : 'Mais NF de saída'}
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm text-amber-600">Mais NF de entrada</span>
                </>
              )}
            </div>

            <div className="w-full mt-2 space-y-1 text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Entradas c/ NF:</span>
                <span className="font-medium text-red-500">{formatCurrency(entradasComNF)}</span>
              </div>
              <div className="flex justify-between">
                <span>Saídas c/ NF:</span>
                <span className="font-medium text-green-600">{formatCurrency(totalSaidasComNF)}</span>
              </div>
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
                <span className="text-muted-foreground">Total Vendas:</span>
                <span className="font-medium">{formatCurrency(totalSaidas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Com NF-e:</span>
                <span className="font-medium text-green-600">{formatCurrency(saidasComNFe)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Com Cupom Fiscal:</span>
                <span className="font-medium text-green-600">{formatCurrency(saidasComCupom)}</span>
              </div>
              <div className="flex justify-between text-sm border-t pt-2">
                <span className="text-muted-foreground">Sem NF:</span>
                <span className={`font-bold ${saidasSemNF > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  {formatCurrency(saidasSemNF)}
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
                {coberturaSaidas.toFixed(1)}%
              </Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}