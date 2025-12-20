import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main className="pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
