'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { authService } from '@/shared/api/auth/authClient';
import { useStore } from '@/store';
import OrbitaLogo from '@/shared/ui/OrbitaLogo';
import NavLinks from './ui/NavLinks';
import SearchBar from './ui/SearchBar';
import UserActions from './ui/UserActions';
import { NAV_LINKS } from '@/widgets/header/ui/header.const';
import { API_ERROR_TOAST_ID, toast } from '@/shared/lib/toast';

export default function Header() {
  const pathname = usePathname();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const user = useStore((state) => state.user);
  const logout = useStore((state) => state.logout);

  async function handleSignOut() {
    try {
      // Revokes the refresh token and clears its cookie. If this fails the cookie stays
      // valid and the next page load would sign the user back in, so keep the session.
      await authService.logout();
    } catch {
      toast.error('Could not sign out. Please try again.', API_ERROR_TOAST_ID);
      return;
    }
    logout();
    toast.success('You have been signed out.');
  }

  return (
    <header className="h-16 bg-slate-800 sticky top-0 z-50 flex items-center px-4 lg:px-6">
      <div className="w-full max-w-282.5 mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <OrbitaLogo size={32} />
            <span className="text-white font-semibold text-xl hidden sm:block">Orbita</span>
          </Link>
          <NavLinks links={NAV_LINKS} pathname={pathname} />
        </div>

        <div className="flex items-center gap-2">
          <SearchBar />
          <UserActions isAuthenticated={isAuthenticated} user={user} logout={handleSignOut} />
        </div>
      </div>
    </header>
  );
}
