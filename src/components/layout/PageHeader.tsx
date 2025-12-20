import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  actions?: ReactNode;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
}: PageHeaderProps) {
  return (
    <div className="space-y-6 mb-8">
      {/* Title Row - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex items-start gap-4 min-w-0">
          {Icon && (
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
          <div className="min-w-0 pt-0.5">
            {/* Headline forte - hierarquia brutal */}
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground/80 mt-1">
                {subtitle}
              </p>
            )}
          </div>
        </div>
        
        {/* Ação principal destacada */}
        {actions && (
          <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {/* Tabs Row - Minimal style */}
      {tabs && tabs.length > 0 && (
        <div className="relative">
          <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-xl w-fit overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                  activeTab === tab.id 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {tab.icon && (
                  <tab.icon className={cn(
                    "h-4 w-4 flex-shrink-0",
                    activeTab === tab.id && "text-primary"
                  )} />
                )}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Extra content */}
      {children}
    </div>
  );
}
