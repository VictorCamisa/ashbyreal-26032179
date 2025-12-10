import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';

export function Layout() {
  return (
    <div className="min-h-screen">
      <TopNavbar />
      <main className="pt-20 md:pt-24 pb-8 md:pb-12">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 lg:px-8 xl:px-12 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
