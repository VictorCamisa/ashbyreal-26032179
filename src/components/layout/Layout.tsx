import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <TopNavbar />
      <main className="pt-14 sm:pt-16">
        <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
