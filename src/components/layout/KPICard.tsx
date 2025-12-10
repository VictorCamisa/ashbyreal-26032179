import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KPICardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'emerald' | 'blue' | 'rose' | 'violet' | 'cyan' | 'amber';
  className?: string;
}

const variantStyles = {
  default: { iconBg: 'bg-primary/10', iconColor: 'text-primary', valueColor: '' },
  success: { iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
  warning: { iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600', valueColor: 'text-amber-600' },
  danger: { iconBg: 'bg-red-100 dark:bg-red-900/30', iconColor: 'text-destructive', valueColor: 'text-destructive' },
  emerald: { iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', iconColor: 'text-emerald-600', valueColor: 'text-emerald-600' },
  blue: { iconBg: 'bg-blue-100 dark:bg-blue-900/30', iconColor: 'text-blue-600', valueColor: 'text-blue-600' },
  rose: { iconBg: 'bg-rose-100 dark:bg-rose-900/30', iconColor: 'text-rose-600', valueColor: 'text-rose-600' },
  violet: { iconBg: 'bg-violet-100 dark:bg-violet-900/30', iconColor: 'text-violet-600', valueColor: 'text-violet-600' },
  cyan: { iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', iconColor: 'text-cyan-600', valueColor: 'text-cyan-600' },
  amber: { iconBg: 'bg-amber-100 dark:bg-amber-900/30', iconColor: 'text-amber-600', valueColor: 'text-amber-600' },
};

export function KPICard({ 
  label, 
  value, 
  icon: Icon, 
  trend,
  subtitle,
  variant = 'default',
  className 
}: KPICardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className={cn("glass-card hover:shadow-md transition-shadow", className)}>
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-0.5 sm:space-y-1 min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wide font-medium truncate">
              {label}
            </p>
            <p className={cn("text-base sm:text-xl font-bold tabular-nums truncate", styles.valueColor)}>
              {value}
            </p>
            <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
              {trend && (
                <span className={cn("text-[10px] sm:text-xs font-medium", trend.isPositive ? "text-emerald-600" : "text-destructive")}>
                  {trend.isPositive ? '+' : '-'}{trend.value.toFixed(1)}%
                </span>
              )}
              {subtitle && <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</span>}
            </div>
          </div>
          <div className={cn("h-8 w-8 sm:h-10 sm:w-10 rounded-xl flex items-center justify-center flex-shrink-0", styles.iconBg)}>
            <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5", styles.iconColor)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface KPIGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function KPIGrid({ children, columns = 4 }: KPIGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-2 sm:grid-cols-3',
    4: 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn("grid gap-2 sm:gap-3 md:gap-4", gridCols[columns])}>
      {children}
    </div>
  );
}
