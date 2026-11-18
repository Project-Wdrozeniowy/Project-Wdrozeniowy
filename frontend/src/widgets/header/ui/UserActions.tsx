import { Link } from 'react-router';
import NotificationBell from './NotificationBell';
import ThemeToggle from './ThemeToggle';
import type { UserProfileDto as UserProfile } from '@/shared/api/generated/models/userProfileDto.dto';

interface UserActionsProps {
  isAuthenticated: boolean;
  user: UserProfile | null;
  logout: () => void;
}

export default function UserActions({ isAuthenticated, user, logout }: UserActionsProps) {
  return (
    <div className="flex items-center gap-2">
      <ThemeToggle />

      {isAuthenticated && <NotificationBell />}

      {isAuthenticated ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-fg-subtle hidden sm:block">
            {user?.displayName ?? user?.username}
          </span>
          <Link to="/settings" className="text-sm text-fg-subtle hover:text-fg transition-colors">
            Settings
          </Link>
          <button
            onClick={logout}
            className="text-sm text-fg-subtle hover:text-fg transition-colors"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="text-sm text-fg hover:text-fg-muted transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            to="/register"
            className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
          >
            Sign up
          </Link>
        </div>
      )}
    </div>
  );
}
