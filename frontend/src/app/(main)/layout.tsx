import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <Header />

      <div className="flex-1 w-full max-w-282.5 mx-auto px-4 lg:px-6 py-6">
        <div className="flex gap-6 items-start">
          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>

          {/* Sidebar — hidden on mobile */}
          <div className="hidden lg:block">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}
