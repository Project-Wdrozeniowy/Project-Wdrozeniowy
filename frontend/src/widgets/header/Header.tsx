import { Link } from 'react-router';
import { useLocation } from 'react-router';
import { signOutSession } from '@/shared/auth/session';
import { useCurrentUser } from '@/shared/api/profile/currentUser';
import { useStore } from '@/store';
import OrbitaLogo from '@/shared/ui/OrbitaLogo';
import NavLinks from './ui/NavLinks';
import SearchBar from './ui/SearchBar';
import UserActions from './ui/UserActions';
import { NAV_LINKS } from '@/widgets/header/ui/header.const';
import { API_ERROR_TOAST_ID, toast } from '@/shared/lib/toast';

export default function Header() {
  const pathname = useLocation().pathname;
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const user = useCurrentUser() ?? null;

  async function handleSignOut() {
    try {
      // The coordinator verifies logout, or hides identity and offers reconciliation after an ambiguous failure.
      await signOutSession();
    } catch {
      toast.error('Could not sign out. Please try again.', API_ERROR_TOAST_ID);
      return;
    }
    toast.success('You have been signed out.');
  }

  return (
    <header className="h-16 bg-header border-b border-line sticky top-0 z-50 flex items-center px-4 lg:px-6">
      <div className="w-full max-w-282.5 mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <OrbitaLogo size={32} />
            <span className="text-fg font-semibold text-xl">Orbita</span>
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
