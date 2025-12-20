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
    <div className="min-h-screen flex flex-col">
      {/* Hero Header - Mais limpo e hierárquico */}
      <div className="relative overflow-hidden bg-gradient-to-b from-card/80 to-background border-b border-border/30">
        {/* Ambient glow sutil */}
        <div className="absolute top-0 left-1/3 w-[500px] h-[300px] bg-[hsl(var(--gradient-start)/0.04)] rounded-full blur-[100px]" />
        
        <div className="relative px-6 sm:px-8 lg:px-12 xl:px-16 py-8 sm:py-10 max-w-6xl mx-auto w-full">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            {/* Title Section */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className={cn(
                  "h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shadow-lg",
                  "bg-gradient-to-br",
                  iconGradient,
                  "shadow-[hsl(var(--gradient-hero-from)/0.25)]"
                )}>
                  <Icon className="h-6 w-6 sm:h-7 sm:w-7 text-primary-foreground" />
                </div>
                {showSparkle && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-gradient-to-br from-success to-success/80 flex items-center justify-center animate-pulse">
                    <Sparkles className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </div>
              <div>
                {/* Headline forte e hierárquico */}
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
                {subtitle && (
                  <p className="text-sm text-muted-foreground/80 mt-1.5 font-normal">
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
                        <span className="absolute bottom-0 left-4 right-4 h-0.5 bg-gradient-to-r from-[hsl(var(--gradient-start))] to-[hsl(var(--gradient-end))] rounded-full" />
                      )}
                    </button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Content Area - Container central com respiro */}
      <div className="flex-1 px-6 sm:px-8 lg:px-12 xl:px-16 py-8 max-w-6xl mx-auto w-full">
        <div className="animate-fade-in space-y-8">
          {children}
        </div>
      </div>
    </div>
  );
}
