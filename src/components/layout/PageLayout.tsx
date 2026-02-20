import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  iconGradient?: string;
  actions?: ReactNode;
  tabs?: Tab[];
  activeTab?: string;
  onTabChange?: (tabId: string) => void;
  children: ReactNode;
  showSparkle?: boolean;
}

export function PageLayout({
  title,
  subtitle,
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
}: PageLayoutProps) {
  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-4 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-3 sm:mb-5">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          
          {actions && (
            <div className="w-full sm:w-auto overflow-x-auto scrollbar-none">
              {actions}
            </div>
          )}
        </div>

        {tabs && tabs.length > 0 && (
          <div className="flex gap-1 bg-muted/50 p-1 rounded-xl overflow-x-auto scrollbar-none -mx-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all whitespace-nowrap flex-shrink-0",
                  activeTab === tab.id 
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/50" 
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="space-y-4 sm:space-y-6">
        {children}
      </div>
    </div>
  );
}
