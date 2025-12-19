import { ReactNode } from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
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
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'emerald' | 'blue' | 'rose' | 'violet' | 'cyan' | 'amber' | 'hero';
  className?: string;
  animationDelay?: number;
}

const variantStyles = {
  default: { 
    iconBg: 'bg-muted', 
    iconColor: 'text-foreground', 
    valueColor: '',
    cardClass: 'glass-card',
    glowColor: '',
  },
  success: { 
    iconBg: 'bg-success/10', 
    iconColor: 'text-success', 
    valueColor: 'text-success',
    cardClass: 'glass-card hover:shadow-success/10',
    glowColor: 'group-hover:shadow-success/20',
  },
  warning: { 
    iconBg: 'bg-amber-100 dark:bg-amber-900/30', 
    iconColor: 'text-amber-600', 
    valueColor: 'text-amber-600',
    cardClass: 'glass-card',
    glowColor: '',
  },
  danger: { 
    iconBg: 'bg-destructive/10', 
    iconColor: 'text-destructive', 
    valueColor: 'text-destructive',
    cardClass: 'glass-card',
    glowColor: '',
  },
  emerald: { 
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/30', 
    iconColor: 'text-emerald-600', 
    valueColor: 'text-emerald-600',
    cardClass: 'glass-card',
    glowColor: '',
  },
  blue: { 
    iconBg: 'bg-blue-100 dark:bg-blue-900/30', 
    iconColor: 'text-blue-600', 
    valueColor: 'text-blue-600',
    cardClass: 'glass-card',
    glowColor: '',
  },
  rose: { 
    iconBg: 'bg-rose-100 dark:bg-rose-900/30', 
    iconColor: 'text-rose-600', 
    valueColor: 'text-rose-600',
    cardClass: 'glass-card',
    glowColor: '',
  },
  violet: { 
    iconBg: 'bg-violet-100 dark:bg-violet-900/30', 
    iconColor: 'text-violet-600', 
    valueColor: 'text-violet-600',
    cardClass: 'glass-card',
    glowColor: '',
  },
  cyan: { 
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/30', 
    iconColor: 'text-cyan-600', 
    valueColor: 'text-cyan-600',
    cardClass: 'glass-card',
    glowColor: '',
  },
  amber: { 
    iconBg: 'bg-amber-100 dark:bg-amber-900/30', 
    iconColor: 'text-amber-600', 
    valueColor: 'text-amber-600',
    cardClass: 'glass-card',
    glowColor: '',
  },
  hero: { 
    iconBg: 'bg-gradient-to-br from-success/20 to-success/5', 
    iconColor: 'text-success', 
    valueColor: 'text-success',
    cardClass: 'kpi-card-hero',
    glowColor: 'group-hover:shadow-lg group-hover:shadow-success/10',
  },
};

export function KPICard({ 
  label, 
  value, 
  icon: Icon, 
  trend,
  subtitle,
  variant = 'default',
  className,
  animationDelay = 0,
}: KPICardProps) {
  const styles = variantStyles[variant];
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown;

  return (
    <div 
      className={cn(
        "group p-4 sm:p-5 transition-all duration-300",
        styles.cardClass,
        styles.glowColor,
        "animate-fade-in opacity-0",
        className
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5 min-w-0 flex-1">
          <p className="text-[11px] sm:text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {label}
          </p>
          <p className={cn(
            "text-xl sm:text-2xl lg:text-3xl font-bold tabular-nums tracking-tight",
            styles.valueColor
          )}>
            {value}
          </p>
          <div className="flex items-center gap-2 flex-wrap pt-0.5">
            {trend && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full",
                trend.isPositive 
                  ? "text-success bg-success/10" 
                  : "text-destructive bg-destructive/10"
              )}>
                <TrendIcon className="h-3 w-3" />
                {trend.value.toFixed(1)}%
              </span>
            )}
            {subtitle && (
              <span className="text-[11px] sm:text-xs text-muted-foreground truncate">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        <div className={cn(
          "h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center flex-shrink-0",
          "transition-all duration-300 group-hover:scale-110",
          styles.iconBg
        )}>
          <Icon className={cn("h-5 w-5 sm:h-6 sm:w-6 transition-colors", styles.iconColor)} />
        </div>
      </div>
    </div>
  );
}

interface KPIGridProps {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 6;
}

export function KPIGrid({ children, columns = 4 }: KPIGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn("grid gap-3 sm:gap-4", gridCols[columns])}>
      {children}
    </div>
  );
}