import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowDownLeft,
  ArrowUpRight,
  Scale,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface KPIsFiscaisProps {
  totalEntradas: number;
  entradasComNF: number;
  entradasSemNF: number;
  totalSaidas: number;
  saidasComNF: number;
  saidasSemNF: number;
  gapFiscal: number;
  totalPendencias: number;
  isLoading?: boolean;
}

export function KPIsFiscais({
  totalEntradas,
  entradasComNF,
  entradasSemNF,
  totalSaidas,
  saidasComNF,
  saidasSemNF,
  gapFiscal,
  totalPendencias,
  isLoading
}: KPIsFiscaisProps) {
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

  const coberturaEntradas = totalEntradas > 0 ? (entradasComNF / totalEntradas) * 100 : 100;
  const coberturaSaidas = totalSaidas > 0 ? (saidasComNF / totalSaidas) * 100 : 100;

  const kpis = [
    {
      title: 'Total Compras (Entradas)',
      value: formatCurrency(totalEntradas),
      subtitle: `Com NF: ${formatCurrency(entradasComNF)}`,
      detail: `Sem NF: ${formatCurrency(entradasSemNF)}`,
      icon: ArrowDownLeft,
      color: 'text-red-500',
      badgeLabel: `${coberturaEntradas.toFixed(0)}% c/ NF`,
      badgeVariant: coberturaEntradas >= 80 ? 'default' : 'destructive',
    },
    {
      title: 'Total Vendas (Saídas)',
      value: formatCurrency(totalSaidas),
      subtitle: `Com NF/Cupom: ${formatCurrency(saidasComNF)}`,
      detail: `Sem NF: ${formatCurrency(saidasSemNF)}`,
      icon: ArrowUpRight,
      color: 'text-green-500',
      badgeLabel: `${coberturaSaidas.toFixed(0)}% c/ NF`,
      badgeVariant: coberturaSaidas >= 80 ? 'default' : 'destructive',
    },
    {
      title: 'Gap Fiscal',
      value: formatCurrency(Math.abs(gapFiscal)),
      subtitle: gapFiscal > 0 ? 'Mais entrada c/ NF que saída' : gapFiscal < 0 ? 'Mais saída c/ NF que entrada' : 'Equilibrado',
      detail: 'Entradas c/ NF − Saídas c/ NF',
      icon: Scale,
      color: gapFiscal === 0 ? 'text-green-500' : Math.abs(gapFiscal) < 5000 ? 'text-amber-500' : 'text-red-500',
      badgeLabel: gapFiscal === 0 ? 'Zerado' : gapFiscal > 0 ? 'Exposto' : 'Ok',
      badgeVariant: gapFiscal <= 0 ? 'default' : 'destructive',
    },
    {
      title: 'Pendências',
      value: String(totalPendencias),
      subtitle: totalPendencias === 0 ? 'Tudo em dia!' : `${totalPendencias} item(ns) pendente(s)`,
      detail: 'Vendas e compras sem documentação',
      icon: totalPendencias === 0 ? CheckCircle2 : AlertTriangle,
      color: totalPendencias === 0 ? 'text-green-500' : totalPendencias <= 5 ? 'text-amber-500' : 'text-red-500',
      badgeLabel: totalPendencias === 0 ? 'Limpo' : 'Atenção',
      badgeVariant: totalPendencias === 0 ? 'default' : 'secondary',
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {kpis.map((kpi, idx) => (
        <Card key={idx} className="hover:shadow-md transition-shadow">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between mb-2">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <Badge variant={kpi.badgeVariant as "default" | "destructive" | "outline" | "secondary"} className="text-[10px]">
                {kpi.badgeLabel}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-medium mb-1">{kpi.title}</p>
            <p className={`text-xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-[11px] text-muted-foreground mt-1">{kpi.subtitle}</p>
            {kpi.detail && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">{kpi.detail}</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
