import { ReactNode } from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
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
  icon: Icon,
  iconGradient = "from-primary to-primary/80",
  actions,
  tabs,
  activeTab,
  onTabChange,
  children,
  showSparkle = false,
}: PageLayoutProps) {
  return (
    <div className="min-h-screen">
      {/* Hero Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-muted/30 border-b border-border/50">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.02]" />
        <div className="relative px-4 sm:px-6 py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Title Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={cn(
                  "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-gradient-to-br flex items-center justify-center shadow-lg",
                  iconGradient,
                  "shadow-primary/25"
                )}>
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                </div>
                {showSparkle && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 flex items-center justify-center animate-pulse">
                    <Sparkles className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>
            
            {/* Actions */}
            {actions && (
              <div className="flex items-center gap-2 flex-wrap">
                {actions}
              </div>
            )}
          </div>

          {/* Navigation Tabs */}
          {tabs && tabs.length > 0 && (
            <div className="mt-6 -mb-[1px]">
              <nav className="flex gap-1 overflow-x-auto scrollbar-hide pb-px">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => onTabChange?.(tab.id)}
                      className={cn(
                        "relative flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all duration-200 whitespace-nowrap",
                        isActive 
                          ? "bg-background text-foreground border border-border/50 border-b-transparent shadow-sm" 
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      )}
                    >
                      {tab.icon && (
                        <tab.icon className={cn(
                          "h-4 w-4 transition-colors",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )} />
                      )}
                      <span className="hidden sm:inline">{tab.label}</span>
                      <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                      {isActive && (
                        <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-primary rounded-full" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-4 sm:p-6">
        <div className="animate-fade-in">
          {children}
        </div>
      </div>
    </div>
  );
}
