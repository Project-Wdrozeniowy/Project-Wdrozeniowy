'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';
import OrbitaLogo from '@/components/ui/OrbitaLogo';
import NavLinks from '@/components/layout/header/NavLinks';
import SearchBar from '@/components/layout/header/SearchBar';
import UserActions from '@/components/layout/header/UserActions';
import { NAV_LINKS } from '@/constants/header';

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useStore();

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
          <UserActions isAuthenticated={isAuthenticated} user={user} logout={logout} />
        </div>
      </div>
    </header>
  );
}
