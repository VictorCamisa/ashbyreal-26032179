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
    <div className="space-y-3 sm:space-y-4">
      {/* Title Row - Stack on mobile */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {Icon && (
            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{subtitle}</p>
            )}
          </div>
        </div>
        
        {actions && (
          <div className="flex items-center gap-2 flex-wrap">
            {actions}
          </div>
        )}
      </div>

      {/* Tabs Row - Horizontal scroll on mobile */}
      {tabs && tabs.length > 0 && (
        <div className="relative -mx-4 sm:mx-0">
          <div className="flex items-center gap-1 p-1 rounded-lg bg-muted/50 w-fit sm:w-fit overflow-x-auto scrollbar-hide px-4 sm:px-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-md text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex-shrink-0",
                  activeTab === tab.id 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                {tab.icon && (
                  <tab.icon className={cn(
                    "h-3.5 w-3.5 sm:h-4 sm:w-4",
                    activeTab === tab.id && "text-primary"
                  )} />
                )}
                <span className="hidden xs:inline">{tab.label}</span>
                <span className="xs:hidden">{tab.label.slice(0, 4)}</span>
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
