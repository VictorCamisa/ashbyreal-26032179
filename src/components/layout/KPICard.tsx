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
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'primary' | 'muted' | 'hero' | 'blue' | 'emerald' | 'rose' | 'violet' | 'cyan' | 'amber';
  className?: string;
  animationDelay?: number;
}

const variantStyles = {
  default: { 
    iconBg: 'bg-muted/50', 
    iconColor: 'text-foreground', 
    valueColor: 'text-foreground',
    borderAccent: '',
  },
  success: { 
    iconBg: 'bg-success/10', 
    iconColor: 'text-success', 
    valueColor: 'text-success',
    borderAccent: 'border-l-4 border-l-success',
  },
  warning: { 
    iconBg: 'bg-amber-500/10', 
    iconColor: 'text-amber-500', 
    valueColor: 'text-amber-500',
    borderAccent: 'border-l-4 border-l-amber-500',
  },
  danger: { 
    iconBg: 'bg-destructive/10', 
    iconColor: 'text-destructive', 
    valueColor: 'text-destructive',
    borderAccent: 'border-l-4 border-l-destructive',
  },
  primary: { 
    iconBg: 'bg-primary/10', 
    iconColor: 'text-primary', 
    valueColor: 'text-primary',
    borderAccent: 'border-l-4 border-l-primary',
  },
  muted: { 
    iconBg: 'bg-muted/30', 
    iconColor: 'text-muted-foreground', 
    valueColor: 'text-muted-foreground',
    borderAccent: '',
  },
  hero: { 
    iconBg: 'bg-gradient-to-br from-success/20 to-success/10', 
    iconColor: 'text-success', 
    valueColor: 'text-success',
    borderAccent: 'border-l-4 border-l-success',
  },
  blue: { 
    iconBg: 'bg-blue-500/10', 
    iconColor: 'text-blue-500', 
    valueColor: 'text-blue-500',
    borderAccent: 'border-l-4 border-l-blue-500',
  },
  emerald: { 
    iconBg: 'bg-emerald-500/10', 
    iconColor: 'text-emerald-500', 
    valueColor: 'text-emerald-500',
    borderAccent: 'border-l-4 border-l-emerald-500',
  },
  rose: { 
    iconBg: 'bg-rose-500/10', 
    iconColor: 'text-rose-500', 
    valueColor: 'text-rose-500',
    borderAccent: 'border-l-4 border-l-rose-500',
  },
  violet: { 
    iconBg: 'bg-violet-500/10', 
    iconColor: 'text-violet-500', 
    valueColor: 'text-violet-500',
    borderAccent: 'border-l-4 border-l-violet-500',
  },
  cyan: { 
    iconBg: 'bg-cyan-500/10', 
    iconColor: 'text-cyan-500', 
    valueColor: 'text-cyan-500',
    borderAccent: 'border-l-4 border-l-cyan-500',
  },
  amber: { 
    iconBg: 'bg-amber-500/10', 
    iconColor: 'text-amber-500', 
    valueColor: 'text-amber-500',
    borderAccent: 'border-l-4 border-l-amber-500',
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
        "group relative rounded-2xl border border-border/40 bg-card p-6",
        "shadow-sm hover:shadow-md transition-all duration-200",
        styles.borderAccent,
        "animate-fade-in opacity-0",
        className
      )}
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Content - hierarquia clara */}
        <div className="space-y-2 min-w-0 flex-1">
          {/* Label pequeno e discreto */}
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            {label}
          </p>
          
          {/* Valor grande e forte */}
          <p className={cn(
            "text-3xl sm:text-4xl font-bold tabular-nums tracking-tight leading-none",
            styles.valueColor
          )}>
            {value}
          </p>
          
          {/* Meta info ainda menor */}
          {(trend || subtitle) && (
            <div className="flex items-center gap-3 pt-1">
              {trend && (
                <span className={cn(
                  "inline-flex items-center gap-1 text-xs font-medium",
                  trend.isPositive 
                    ? "text-success" 
                    : "text-destructive"
                )}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  {trend.value.toFixed(1)}%
                </span>
              )}
              {subtitle && (
                <span className="text-xs text-muted-foreground/70">
                  {subtitle}
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* Ícone */}
        <div className={cn(
          "h-12 w-12 rounded-xl flex items-center justify-center flex-shrink-0",
          "transition-transform duration-200 group-hover:scale-105",
          styles.iconBg
        )}>
          <Icon className={cn("h-6 w-6", styles.iconColor)} />
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
    <div className={cn("grid gap-4 sm:gap-6", gridCols[columns])}>
      {children}
    </div>
  );
}
