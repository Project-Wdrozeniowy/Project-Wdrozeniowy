import Link from 'next/link';
import { BellIcon, TrendingIcon } from '@/components/ui/icons';
import type { UserProfile } from '@/shared/types';

interface Props {
  isAuthenticated: boolean;
  user: UserProfile | null;
  logout: () => void;
}

export default function UserActions({ isAuthenticated, user, logout }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        aria-label="Trending"
        className="p-2 rounded text-gray-50 hover:bg-slate-700 transition-colors"
      >
        <TrendingIcon />
      </button>

      {isAuthenticated && (
        <button
          aria-label="Notifications"
          className="p-2 rounded text-gray-50 hover:bg-slate-700 transition-colors"
        >
          <BellIcon />
        </button>
      )}

      {isAuthenticated ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-400 hidden sm:block">
            {user?.displayName ?? user?.username}
          </span>
          <button
            onClick={logout}
            className="text-sm text-slate-400 hover:text-gray-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-sm text-gray-50 hover:text-slate-300 transition-colors px-3 py-1.5"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
          >
            Sign up
          </Link>
        </div>
      )}
    </div>
  );
}
