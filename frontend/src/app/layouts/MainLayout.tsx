import { Outlet, useMatches } from 'react-router';
import { isWideRoute } from '@/app/router/routeHandle';
import { cn } from '@/shared/lib/cn';
import Header from '@/widgets/header/Header';
import MobileTabBar from '@/widgets/header/ui/MobileTabBar';
import { StorageSettingsButton } from '@/widgets/consent-banner';
import Sidebar from '@/widgets/sidebar/Sidebar';

export default function MainLayout() {
  const wide = useMatches().some((match) => isWideRoute(match.handle));

  return (
    <div className="min-h-screen bg-page flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      <Header />

      <div className="flex-1 w-full max-w-282.5 mx-auto px-4 lg:px-6 py-6">
        <div className="flex gap-6 items-start">
          {/* Main content */}
          <main className={cn('flex-1 min-w-0', wide && 'mx-auto max-w-5xl')}>
            <Outlet />
          </main>

          {/* Sidebar: hidden on mobile, and absent on a wide page */}
          {!wide && (
            <div className="hidden lg:block">
              <Sidebar />
            </div>
          )}
        </div>
      </div>

      <MobileTabBar />

      <footer className="border-t border-line">
        <div className="w-full max-w-282.5 mx-auto px-4 lg:px-6 py-4 flex justify-end">
          <StorageSettingsButton />
        </div>
      </footer>
    </div>
  );
}
