import { Outlet, useLocation } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';
import { MobileNavBar } from './MobileNavBar';
import { PageBreadcrumbs } from './PageBreadcrumbs';
import { SystemAssistant } from '@/components/assistant/SystemAssistant';
import { useAssistant } from '@/contexts/AssistantContext';

export function Layout() {
  const location = useLocation();
  const { getModuleInfo } = useAssistant();
  const moduleInfo = getModuleInfo(location.pathname);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <TopNavbar />
      <main className="pt-14 sm:pt-16 pb-20 lg:pb-8">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-3 sm:py-6">
          <PageBreadcrumbs />
          <Outlet />
        </div>
      </main>
      <MobileNavBar />
      <SystemAssistant 
        moduleName={moduleInfo.name} 
        moduleContext={moduleInfo.context} 
      />
    </div>
  );
}
