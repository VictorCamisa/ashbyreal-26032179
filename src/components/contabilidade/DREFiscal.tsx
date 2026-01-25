import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface DREFiscalProps {
  receitaBruta: number;
  impostosSaida: number;
  custoMercadorias: number;
  impostosEntrada: number;
  isLoading?: boolean;
}

export function DREFiscal({
  receitaBruta,
  impostosSaida,
  custoMercadorias,
  impostosEntrada,
  isLoading
}: DREFiscalProps) {
  const receitaLiquida = receitaBruta - impostosSaida;
  const lucroBruto = receitaLiquida - custoMercadorias;
  const creditoImposto = impostosEntrada;
  const debitoImposto = impostosSaida;
  const saldoImposto = creditoImposto - debitoImposto;
  const margemBruta = receitaBruta > 0 ? (lucroBruto / receitaBruta) * 100 : 0;

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            DRE Fiscal Simplificado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  const lines = [
    { label: 'Receita Bruta (Vendas)', value: receitaBruta, type: 'header', icon: TrendingUp },
    { label: '(-) Impostos sobre Vendas', value: -impostosSaida, type: 'expense' },
    { label: '= Receita Líquida', value: receitaLiquida, type: 'subtotal' },
    { label: '(-) Custo das Mercadorias (CMV)', value: -custoMercadorias, type: 'expense' },
    { label: '= Lucro Bruto Fiscal', value: lucroBruto, type: 'total', icon: lucroBruto >= 0 ? TrendingUp : TrendingDown },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          DRE Fiscal Simplificado
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* DRE Lines */}
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div 
              key={idx}
              className={`flex justify-between items-center p-2 rounded ${
                line.type === 'header' ? 'bg-primary/10 font-semibold' :
                line.type === 'subtotal' ? 'bg-muted font-medium border-t' :
                line.type === 'total' ? 'bg-primary/20 font-bold text-lg border-t-2' :
                ''
              }`}
            >
              <div className="flex items-center gap-2">
                {line.icon && <line.icon className={`h-4 w-4 ${line.value >= 0 ? 'text-green-600' : 'text-red-600'}`} />}
                <span className={line.type === 'expense' ? 'text-muted-foreground pl-4' : ''}>{line.label}</span>
              </div>
              <span className={
                line.type === 'total' 
                  ? (line.value >= 0 ? 'text-green-600' : 'text-red-600')
                  : line.value < 0 ? 'text-red-600' : ''
              }>
                {formatCurrency(Math.abs(line.value))}
                {line.value < 0 && line.type !== 'total' && ' (-)'}
              </span>
            </div>
          ))}
        </div>

        {/* Margem e Impostos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          {/* Margem Bruta */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Margem Bruta Fiscal</div>
            <div className={`text-2xl font-bold ${margemBruta >= 30 ? 'text-green-600' : margemBruta >= 15 ? 'text-amber-600' : 'text-red-600'}`}>
              {margemBruta.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lucro Bruto / Receita Bruta
            </p>
          </div>

          {/* Saldo ICMS */}
          <div className="p-4 rounded-lg bg-muted/50">
            <div className="text-sm text-muted-foreground">Saldo ICMS</div>
            <div className="flex items-center gap-2">
              <div className={`text-2xl font-bold ${saldoImposto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(Math.abs(saldoImposto))}
              </div>
              {saldoImposto >= 0 ? (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">CRÉDITO</span>
              ) : (
                <span className="text-xs text-red-600 bg-red-100 px-2 py-0.5 rounded">DÉBITO</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Crédito (entradas) - Débito (saídas)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
