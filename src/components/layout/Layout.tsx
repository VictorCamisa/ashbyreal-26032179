import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';

export function Layout() {
  return (
    <div className="min-h-screen">
      <TopNavbar />
      <main className="pt-24 pb-12">
        <div className="mx-auto max-w-[1400px] px-6 md:px-8 lg:px-12 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
