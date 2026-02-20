import { LucideIcon, TrendingUp, TrendingDown, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

export interface InteractiveKPICardProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: {
    value: number;
    isPositive?: boolean;
  };
  subtitle?: string;
  sparklineData?: number[];
  href?: string;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
  animationDelay?: number;
}

export function InteractiveKPICard({ 
  label, 
  value, 
  icon: Icon, 
  trend,
  subtitle,
  href,
  variant = 'default',
  className,
  animationDelay = 0,
}: InteractiveKPICardProps) {
  const navigate = useNavigate();
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown;

  const accentColor = {
    default: 'text-primary bg-primary/10',
    success: 'text-success bg-success/10',
    warning: 'text-amber-500 bg-amber-500/10',
    danger: 'text-destructive bg-destructive/10',
  }[variant];

  const borderAccent = {
    default: 'hover:ring-primary/20',
    success: 'hover:ring-success/20',
    warning: 'hover:ring-amber-500/20',
    danger: 'hover:ring-destructive/20',
  }[variant];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: animationDelay / 1000, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={() => href && navigate(href)}
      className={cn(
        "relative rounded-2xl bg-card border border-border/50 p-3.5 sm:p-5 transition-all duration-300",
        "kpi-glow hover:ring-1",
        href && "cursor-pointer group",
        borderAccent,
        className
      )}
    >
      {/* Accent line */}
      <div className={cn(
        "absolute top-0 left-4 right-4 h-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity",
        variant === 'success' && "bg-success",
        variant === 'warning' && "bg-amber-500",
        variant === 'danger' && "bg-destructive",
        variant === 'default' && "bg-primary",
      )} />

      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 sm:mb-3">
            {Icon && (
              <div className={cn("h-7 w-7 sm:h-8 sm:w-8 rounded-xl flex items-center justify-center shrink-0", accentColor)}>
                <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </div>
            )}
            <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </span>
          </div>
          
          <p className="text-xl sm:text-2xl font-extrabold tabular-nums tracking-tight truncate">
            {value}
          </p>
          
          {(trend || subtitle) && (
            <div className="flex items-center gap-1.5 mt-1.5 sm:mt-2 flex-wrap">
              {trend && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded-md shrink-0",
                  trend.isPositive 
                    ? "text-success bg-success/10" 
                    : "text-destructive bg-destructive/10"
                )}>
                  <TrendIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {trend.value.toFixed(1)}%
                </span>
              )}
              {subtitle && (
                <span className="text-[10px] sm:text-xs text-muted-foreground truncate">{subtitle}</span>
              )}
            </div>
          )}
        </div>
        
        {href && (
          <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/30 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
        )}
      </div>
    </motion.div>
  );
}
