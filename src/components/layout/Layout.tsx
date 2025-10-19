import { Outlet } from 'react-router-dom';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { Beer } from 'lucide-react';

export function Layout() {
  return (
    <div className="min-h-screen flex w-full">
      <AppSidebar />
      <div className="flex-1 flex flex-col">
        <header className="h-16 border-b border-border bg-card flex items-center px-4 gap-4">
          <SidebarTrigger />
          <div className="flex items-center gap-2">
            <Beer className="h-6 w-6 text-secondary" />
            <h1 className="text-xl font-bold text-secondary">Ashby</h1>
          </div>
        </header>
        <main className="flex-1 p-6 overflow-auto bg-background">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
