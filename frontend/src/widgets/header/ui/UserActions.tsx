import { Link, useLocation } from 'react-router';
import AccountMenu from './AccountMenu';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import type { UserProfileDto as UserProfile } from '@/shared/api/generated/models/userProfileDto.dto';

interface UserActionsProps {
  isAuthenticated: boolean;
  user: UserProfile | null;
  logout: () => void;
}

export default function UserActions({ isAuthenticated, user, logout }: UserActionsProps) {
  const pathname = useLocation().pathname;

  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />

      {isAuthenticated && <NotificationBell />}

      {/*
        The account links sit behind the user icon, as in the design: the name, "Settings" and "Sign out"
        as text did not fit next to the page links and the search field between 768px and 1000px.
        Keyed by the page: following any link, or going back, closes an open menu.
      */}
      <AccountMenu
        key={pathname}
        isAuthenticated={isAuthenticated}
        user={user}
        logout={logout}
        // A guest also has the two buttons below from `lg` up, so the menu is only needed before that.
        className={isAuthenticated ? undefined : 'lg:hidden'}
      />

      {!isAuthenticated && (
        <div className="hidden lg:flex items-center gap-2">
          <Link
            to="/login"
            className="text-sm text-fg hover:text-fg-muted transition-colors px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            Sign up
          </Link>
        </div>
      )}
    </div>
  );
}
