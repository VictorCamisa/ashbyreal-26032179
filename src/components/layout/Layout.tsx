import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <TopNavbar />
      <main className="pt-20 pb-8 px-4 md:px-6 lg:px-8">
        <div className="container mx-auto max-w-7xl animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
