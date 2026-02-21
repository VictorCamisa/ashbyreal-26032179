import { Outlet, useLocation } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { MobileNavBar } from './MobileNavBar';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { SystemAssistant } from '@/components/assistant/SystemAssistant';
import { useAssistant } from '@/contexts/AssistantContext';
import { SidebarProvider, SidebarInset, SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Separator } from '@/components/ui/separator';

export function Layout() {
  const location = useLocation();
  const { getModuleInfo } = useAssistant();
  const moduleInfo = getModuleInfo(location.pathname);

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        {/* Top header bar with trigger + breadcrumbs */}
        <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border/40 px-3 lg:px-4">
          <SidebarTrigger className="h-7 w-7 shrink-0" />
          <Separator orientation="vertical" className="h-4" />
          <div className="flex-1 min-w-0">
            <PageBreadcrumbs />
          </div>
          <ThemeToggle />
        </header>

        {/* Main content */}
        <main className="flex-1 pb-20 lg:pb-6">
          <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
            <Outlet />
          </div>
        </main>
      </SidebarInset>

      {/* Mobile bottom nav - only on mobile */}
      <MobileNavBar />

      <SystemAssistant
        moduleName={moduleInfo.name}
        moduleContext={moduleInfo.context}
      />
    </SidebarProvider>
  );
}
