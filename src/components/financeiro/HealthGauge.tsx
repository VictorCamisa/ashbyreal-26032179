import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Activity, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react';

interface HealthGaugeProps {
  receitas: number;
  despesas: number;
  transacoesAtrasadas: number;
  faturasAbertas: number;
}

type HealthLevel = 'excellent' | 'good' | 'stable' | 'warning' | 'critical';

interface HealthConfig {
  level: HealthLevel;
  label: string;
  color: string;
  bgColor: string;
  ringColor: string;
  icon: typeof CheckCircle;
}

const healthConfigs: Record<HealthLevel, HealthConfig> = {
  excellent: {
    level: 'excellent',
    label: 'Excelente',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 dark:bg-emerald-900/30',
    ringColor: 'stroke-emerald-500',
    icon: CheckCircle,
  },
  good: {
    level: 'good',
    label: 'Bom',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    ringColor: 'stroke-blue-500',
    icon: TrendingUp,
  },
  stable: {
    level: 'stable',
    label: 'Estável',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    ringColor: 'stroke-amber-500',
    icon: Activity,
  },
  warning: {
    level: 'warning',
    label: 'Atenção',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-900/30',
    ringColor: 'stroke-orange-500',
    icon: AlertTriangle,
  },
  critical: {
    level: 'critical',
    label: 'Crítico',
    color: 'text-red-600',
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    ringColor: 'stroke-red-500',
    icon: TrendingDown,
  },
};

export function HealthGauge({ receitas, despesas, transacoesAtrasadas, faturasAbertas }: HealthGaugeProps) {
  // Calculate health score (0-100)
  const calculateScore = () => {
    let score = 50; // Base score

    // Savings rate factor (40 points max)
    if (receitas > 0) {
      const savingsRate = (receitas - despesas) / receitas;
      if (savingsRate >= 0.3) score += 40;
      else if (savingsRate >= 0.2) score += 30;
      else if (savingsRate >= 0.1) score += 20;
      else if (savingsRate >= 0) score += 10;
      else if (savingsRate >= -0.1) score -= 10;
      else if (savingsRate >= -0.2) score -= 20;
      else score -= 30;
    }

    // Overdue transactions penalty (20 points max)
    if (transacoesAtrasadas === 0) score += 10;
    else if (transacoesAtrasadas <= 2) score -= 5;
    else if (transacoesAtrasadas <= 5) score -= 10;
    else score -= 20;

    // Open invoices factor
    if (faturasAbertas === 0) score += 5;
    else if (faturasAbertas <= 2) score += 0;
    else score -= 5;

    return Math.max(0, Math.min(100, score));
  };

  const score = calculateScore();

  const getHealthLevel = (): HealthLevel => {
    if (score >= 80) return 'excellent';
    if (score >= 65) return 'good';
    if (score >= 50) return 'stable';
    if (score >= 35) return 'warning';
    return 'critical';
  };

  const healthLevel = getHealthLevel();
  const config = healthConfigs[healthLevel];
  const Icon = config.icon;

  // SVG arc calculations
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <Card className="glass-card">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          Saúde Financeira
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          {/* Gauge */}
          <div className="relative">
            <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke="currentColor"
                strokeWidth="10"
                className="text-muted/30"
              />
              {/* Progress arc */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                strokeWidth="10"
                strokeLinecap="round"
                className={config.ringColor}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset,
                  transition: 'stroke-dashoffset 0.5s ease-out',
                }}
              />
            </svg>
            {/* Center content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn("text-2xl font-bold", config.color)}>{score}</span>
              <span className="text-xs text-muted-foreground">pontos</span>
            </div>
          </div>

          {/* Status info */}
          <div className="flex-1 space-y-3">
            <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium", config.bgColor, config.color)}>
              <Icon className="h-4 w-4" />
              {config.label}
            </div>
            
            <div className="space-y-1 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Taxa de poupança</span>
                <span className={cn("font-medium", receitas > despesas ? "text-emerald-600" : "text-destructive")}>
                  {receitas > 0 ? ((receitas - despesas) / receitas * 100).toFixed(0) : 0}%
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Contas atrasadas</span>
                <span className={cn("font-medium", transacoesAtrasadas === 0 ? "text-emerald-600" : "text-destructive")}>
                  {transacoesAtrasadas}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Faturas abertas</span>
                <span className="font-medium">{faturasAbertas}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
