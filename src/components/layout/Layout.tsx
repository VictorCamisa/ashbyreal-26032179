import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col w-full bg-background">
      <TopNavbar />
      <main className="flex-1 container py-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}