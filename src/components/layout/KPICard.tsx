import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KPICardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  subtitle?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'muted' | 'hero' | 'blue' | 'emerald' | 'rose' | 'violet' | 'cyan' | 'amber';
  className?: string;
  animationDelay?: number;
}

export function KPICard({ 
  label, 
  value, 
  icon: Icon, 
  trend,
  subtitle,
  className,
  animationDelay = 0,
}: KPICardProps) {
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown;

  return (
    <div 
      className={cn(
        "rounded-xl bg-card border border-border/60 p-5 shadow-sm hover:shadow-md transition-shadow animate-fade-in opacity-0",
        className
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {label}
            </span>
            {Icon && <Icon className="h-3.5 w-3.5 text-muted-foreground" />}
          </div>
          
          <p className="text-2xl font-bold tabular-nums tracking-tight">
            {value}
          </p>
          
          {(trend || subtitle) && (
            <div className="flex items-center gap-2 mt-1.5">
              {trend && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-xs font-medium",
                  trend.isPositive ? "text-success" : "text-destructive"
                )}>
                  <TrendIcon className="h-3 w-3" />
                  {trend.value.toFixed(1)}%
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground">{subtitle}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface KPIGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function KPIGrid({ children, columns = 4 }: KPIGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {children}
    </div>
  );
}
