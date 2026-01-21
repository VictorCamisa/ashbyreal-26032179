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
  sparklineData,
  href,
  variant = 'default',
  className,
  animationDelay = 0,
}: InteractiveKPICardProps) {
  const navigate = useNavigate();
  const TrendIcon = trend?.isPositive ? TrendingUp : TrendingDown;

  const variantStyles = {
    default: 'border-border/60 hover:border-primary/30',
    success: 'border-success/30 hover:border-success/50 bg-success/5',
    warning: 'border-amber-500/30 hover:border-amber-500/50 bg-amber-500/5',
    danger: 'border-destructive/30 hover:border-destructive/50 bg-destructive/5',
  };

  const handleClick = () => {
    if (href) navigate(href);
  };

  // Simple sparkline SVG
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    
    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min || 1;
    
    const width = 60;
    const height = 20;
    const padding = 2;
    
    const points = sparklineData.map((val, i) => {
      const x = padding + (i / (sparklineData.length - 1)) * (width - padding * 2);
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    const isPositive = sparklineData[sparklineData.length - 1] >= sparklineData[0];

    return (
      <svg width={width} height={height} className="ml-auto opacity-60">
        <polyline
          points={points}
          fill="none"
          stroke={isPositive ? 'hsl(var(--success))' : 'hsl(var(--destructive))'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: animationDelay / 1000 }}
      onClick={handleClick}
      className={cn(
        "rounded-xl bg-card border p-3 sm:p-5 shadow-sm transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.98]",
        href && "cursor-pointer group",
        variantStyles[variant],
        className
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 mb-1 sm:mb-2">
            {Icon && (
              <div className={cn(
                "h-6 w-6 sm:h-8 sm:w-8 rounded-lg flex items-center justify-center transition-colors flex-shrink-0",
                variant === 'success' && "bg-success/20 text-success",
                variant === 'warning' && "bg-amber-500/20 text-amber-500",
                variant === 'danger' && "bg-destructive/20 text-destructive",
                variant === 'default' && "bg-primary/10 text-primary"
              )}>
                <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
              </div>
            )}
            <span className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide truncate">
              {label}
            </span>
            {href && (
              <ArrowRight className="h-3 w-3 ml-auto text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            )}
          </div>
          
          <div className="flex items-end justify-between gap-2">
            <p className="text-lg sm:text-2xl font-bold tabular-nums tracking-tight truncate">
              {value}
            </p>
            {renderSparkline()}
          </div>
          
          {(trend || subtitle) && (
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1 sm:mt-2 flex-wrap">
              {trend && (
                <span className={cn(
                  "inline-flex items-center gap-0.5 text-[10px] sm:text-xs font-medium px-1 sm:px-1.5 py-0.5 rounded-full flex-shrink-0",
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
      </div>
    </motion.div>
  );
}
