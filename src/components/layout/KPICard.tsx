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
        "p-4 animate-fade-in opacity-0",
        className
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {label}
        </p>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      
      <p className="text-2xl font-semibold mt-1 tabular-nums">
        {value}
      </p>
      
      {(trend || subtitle) && (
        <div className="flex items-center gap-2 mt-1">
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-0.5 text-xs",
              trend.isPositive ? "text-green-600" : "text-red-500"
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
  );
}

interface KPIGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4;
}

export function KPIGrid({ children, columns = 4 }: KPIGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-2 md:grid-cols-4',
  };

  return (
    <div className={cn(
      "grid divide-x divide-y border rounded-lg bg-card",
      gridCols[columns]
    )}>
      {children}
    </div>
  );
}
