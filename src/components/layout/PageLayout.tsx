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
      <div className="mb-4 sm:mb-6">
        {/* Title and actions - stack on mobile */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-3 sm:mb-4">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-semibold tracking-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          
          {actions && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-none">
              {actions}
            </div>
          )}
        </div>

        {tabs && tabs.length > 0 && (
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg overflow-x-auto scrollbar-none -mx-1 px-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0",
                  activeTab === tab.id 
                    ? "bg-background text-foreground shadow-sm" 
                    : "text-muted-foreground hover:text-foreground"
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
