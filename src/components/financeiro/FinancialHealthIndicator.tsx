import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

interface FinancialHealthIndicatorProps {
  savingsRate: number;
  avgResultado: number;
  className?: string;
}

export function FinancialHealthIndicator({ 
  savingsRate, 
  avgResultado,
  className 
}: FinancialHealthIndicatorProps) {
  // Determine health status based on savings rate
  const getHealthStatus = () => {
    if (savingsRate >= 20) return { status: 'excellent', label: 'Excelente', color: 'emerald', icon: CheckCircle2 };
    if (savingsRate >= 10) return { status: 'good', label: 'Bom', color: 'green', icon: CheckCircle2 };
    if (savingsRate >= 0) return { status: 'neutral', label: 'Estável', color: 'yellow', icon: Minus };
    if (savingsRate >= -10) return { status: 'warning', label: 'Atenção', color: 'orange', icon: AlertTriangle };
    return { status: 'critical', label: 'Crítico', color: 'red', icon: XCircle };
  };

  const health = getHealthStatus();
  const Icon = health.icon;

  // Calculate the progress for the gauge (0-100)
  const progress = Math.min(100, Math.max(0, (savingsRate + 50) * 100 / 100));

  const getGradientColor = () => {
    if (health.status === 'excellent') return 'from-emerald-500 to-emerald-400';
    if (health.status === 'good') return 'from-green-500 to-green-400';
    if (health.status === 'neutral') return 'from-yellow-500 to-yellow-400';
    if (health.status === 'warning') return 'from-orange-500 to-orange-400';
    return 'from-red-500 to-red-400';
  };

  const getTextColor = () => {
    if (health.status === 'excellent' || health.status === 'good') return 'text-emerald-600';
    if (health.status === 'neutral') return 'text-yellow-600';
    if (health.status === 'warning') return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <div className={cn("p-6", className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">Saúde Financeira</h3>
        <div className={cn(
          "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
          health.status === 'excellent' && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
          health.status === 'good' && "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
          health.status === 'neutral' && "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
          health.status === 'warning' && "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
          health.status === 'critical' && "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
        )}>
          <Icon className="h-3 w-3" />
          {health.label}
        </div>
      </div>

      {/* Gauge visualization */}
      <div className="relative h-32 flex items-center justify-center mb-4">
        <svg className="w-48 h-24 -rotate-0" viewBox="0 0 200 100">
          {/* Background arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-muted/20"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${progress * 2.5} 250`}
          />
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" className={cn(
                health.status === 'excellent' && "stop-color: rgb(16 185 129)",
                health.status === 'good' && "stop-color: rgb(34 197 94)",
                health.status === 'neutral' && "stop-color: rgb(234 179 8)",
                health.status === 'warning' && "stop-color: rgb(249 115 22)",
                health.status === 'critical' && "stop-color: rgb(239 68 68)"
              )} style={{ stopColor: health.status === 'excellent' ? 'rgb(16 185 129)' : health.status === 'good' ? 'rgb(34 197 94)' : health.status === 'neutral' ? 'rgb(234 179 8)' : health.status === 'warning' ? 'rgb(249 115 22)' : 'rgb(239 68 68)' }} />
              <stop offset="100%" style={{ stopColor: health.status === 'excellent' ? 'rgb(52 211 153)' : health.status === 'good' ? 'rgb(74 222 128)' : health.status === 'neutral' ? 'rgb(250 204 21)' : health.status === 'warning' ? 'rgb(251 146 60)' : 'rgb(248 113 113)' }} />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pt-8">
          <span className={cn("text-3xl font-bold", getTextColor())}>
            {savingsRate.toFixed(0)}%
          </span>
          <span className="text-xs text-muted-foreground">Taxa de Poupança</span>
        </div>
      </div>

      {/* Additional metrics */}
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
        <div>
          <p className="text-xs text-muted-foreground mb-1">Resultado Médio/Mês</p>
          <p className={cn(
            "text-sm font-semibold",
            avgResultado >= 0 ? "text-emerald-600" : "text-destructive"
          )}>
            {avgResultado >= 0 ? '+' : ''}R$ {avgResultado.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1">Tendência</p>
          <div className="flex items-center gap-1">
            {avgResultado >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-destructive" />
            )}
            <span className={cn(
              "text-sm font-semibold",
              avgResultado >= 0 ? "text-emerald-600" : "text-destructive"
            )}>
              {avgResultado >= 0 ? 'Positiva' : 'Negativa'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
