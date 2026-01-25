import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  CheckCircle2, 
  FileWarning, 
  Percent, 
  TrendingUp, 
  Receipt
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface KPIsFiscaisProps {
  gapFiscalEntradas: number;
  gapFiscalSaidas: number;
  margemFiscal: number;
  creditoICMS: number;
  debitoICMS: number;
  coberturaDocumental: number;
  totalPendencias: number;
  isLoading?: boolean;
}

export function KPIsFiscais({
  gapFiscalEntradas,
  gapFiscalSaidas,
  margemFiscal,
  creditoICMS,
  debitoICMS,
  coberturaDocumental,
  totalPendencias,
  isLoading
}: KPIsFiscaisProps) {
  const saldoICMS = creditoICMS - debitoICMS;
  const gapTotal = gapFiscalEntradas + gapFiscalSaidas;

  const formatCurrency = (value: number) => 
    value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardContent className="pt-4">
              <Skeleton className="h-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const kpis = [
    {
      title: 'Gap Fiscal Total',
      value: formatCurrency(gapTotal),
      subtitle: `Entradas: ${formatCurrency(gapFiscalEntradas)} | Saídas: ${formatCurrency(gapFiscalSaidas)}`,
      icon: FileWarning,
      status: gapTotal === 0 ? 'success' : gapTotal < 1000 ? 'warning' : 'danger',
      badge: gapTotal === 0 ? 'Zerado' : 'Pendente'
    },
    {
      title: 'Margem Fiscal',
      value: `${margemFiscal.toFixed(1)}%`,
      subtitle: 'Lucro Bruto / Receita',
      icon: TrendingUp,
      status: margemFiscal >= 30 ? 'success' : margemFiscal >= 15 ? 'warning' : 'danger',
      badge: margemFiscal >= 30 ? 'Saudável' : margemFiscal >= 15 ? 'Atenção' : 'Crítico'
    },
    {
      title: 'Saldo ICMS',
      value: formatCurrency(Math.abs(saldoICMS)),
      subtitle: saldoICMS >= 0 ? 'Crédito a recuperar' : 'Débito a pagar',
      icon: Receipt,
      status: saldoICMS >= 0 ? 'success' : 'warning',
      badge: saldoICMS >= 0 ? 'Crédito' : 'Débito'
    },
    {
      title: 'Cobertura Documental',
      value: `${coberturaDocumental.toFixed(1)}%`,
      subtitle: `${totalPendencias} pendência${totalPendencias !== 1 ? 's' : ''}`,
      icon: coberturaDocumental >= 95 ? CheckCircle2 : AlertTriangle,
      status: coberturaDocumental >= 95 ? 'success' : coberturaDocumental >= 80 ? 'warning' : 'danger',
      badge: coberturaDocumental >= 95 ? 'Excelente' : coberturaDocumental >= 80 ? 'Bom' : 'Baixo'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-amber-600';
      case 'danger': return 'text-red-600';
      default: return 'text-foreground';
    }
  };

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'success': return 'default';
      case 'warning': return 'secondary';
      case 'danger': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground font-medium">{kpi.title}</p>
                <p className={`text-2xl font-bold ${getStatusColor(kpi.status)}`}>
                  {kpi.value}
                </p>
                <p className="text-xs text-muted-foreground">{kpi.subtitle}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <kpi.icon className={`h-5 w-5 ${getStatusColor(kpi.status)}`} />
                <Badge variant={getBadgeVariant(kpi.status) as any} className="text-xs">
                  {kpi.badge}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
