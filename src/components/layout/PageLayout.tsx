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
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          
          {actions && (
            <div className="w-full sm:w-auto overflow-x-auto scrollbar-none flex-shrink-0">
              {actions}
            </div>
          )}
        </div>

        {tabs && tabs.length > 0 && (
          <div className="flex gap-1 mt-5 bg-secondary/60 p-1 rounded-xl w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "px-3.5 py-2 text-sm font-medium transition-all duration-200 whitespace-nowrap flex-shrink-0 rounded-lg flex items-center gap-1.5",
                    activeTab === tab.id 
                      ? "bg-card text-foreground shadow-soft" 
                      : "text-muted-foreground hover:text-foreground"
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
      <div className="space-y-5">
        {children}
      </div>
    </div>
  );
}
