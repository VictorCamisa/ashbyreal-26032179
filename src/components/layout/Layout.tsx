import { Outlet } from 'react-router-dom';
import { TopNavbar } from './TopNavbar';

export function Layout() {
  return (
    <div className="min-h-screen">
      <TopNavbar />
      <main className="pt-20 md:pt-24 pb-12 md:pb-16">
        {/* Container central com max-width reduzido e respiro lateral generoso */}
        <div className="mx-auto max-w-6xl px-6 sm:px-8 lg:px-12 xl:px-16 animate-fade-in">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
