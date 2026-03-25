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
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight">{title}</h1>
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
          <div className="flex gap-1 border-b border-border overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 border-b-2 -mb-px flex items-center gap-1.5",
                    activeTab === tab.id 
                      ? "border-primary text-foreground" 
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  )}
                >
                  {Icon && <Icon className="h-3.5 w-3.5" />}
                  {tab.label}
                </button>
              );
            })}
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
