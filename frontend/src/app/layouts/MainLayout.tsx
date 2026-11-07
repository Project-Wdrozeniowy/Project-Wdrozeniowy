import { Outlet } from 'react-router';
import Header from '@/widgets/header/Header';
import Sidebar from '@/widgets/sidebar/Sidebar';

export default function MainLayout() {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header />

      <div className="flex-1 w-full max-w-282.5 mx-auto px-4 lg:px-6 py-6">
        <div className="flex gap-6 items-start">
          {/* Main content */}
          <main className="flex-1 min-w-0">
            <Outlet />
          </main>

          {/* Sidebar — hidden on mobile */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
