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
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>

        {tabs && tabs.length > 0 && (
          <div className="flex gap-1 bg-secondary/50 p-1 rounded-lg w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange?.(tab.id)}
                className={cn(
                  "px-3 py-1.5 text-sm font-medium rounded-md transition-all",
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
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}
