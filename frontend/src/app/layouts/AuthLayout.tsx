import { Outlet } from 'react-router';
import { StorageSettingsButton } from '@/widgets/consent-banner';
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-page flex flex-col items-center justify-center py-12 px-4">
      <Outlet />
      <footer className="mt-8">
        <StorageSettingsButton />
      </footer>
    </div>
  );
}
