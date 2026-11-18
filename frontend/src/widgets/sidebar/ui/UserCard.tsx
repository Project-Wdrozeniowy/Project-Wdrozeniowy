import { Link } from 'react-router';
import type { UserProfileDto as UserProfile } from '@/shared/api/generated/models/userProfileDto.dto';
import { NAV_LINKS, USER_STATS } from '@/widgets/sidebar/ui/sidebar.const';
import { cn } from '@/shared/lib/cn';

interface UserCardProps {
  user: UserProfile;
  initials: string;
  pathname: string;
}

export default function UserCard({ user, initials, pathname }: UserCardProps) {
  return (
    <div className="bg-surface rounded-xl p-4 flex flex-col gap-4 border border-line">
      <Link to="/profile" className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-raised flex items-center justify-center text-fg font-semibold text-base shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-fg font-semibold text-sm truncate">
            {user.displayName || user.username}
          </p>
          <p className="text-fg-muted text-xs">@{user.username}</p>
        </div>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              to={href}
              className={cn(
                'flex items-center px-3 py-2.5 rounded text-sm transition-colors',
                active ? 'bg-raised text-fg' : 'text-fg hover:bg-raised'
              )}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex gap-2">
        {USER_STATS.map(({ label }, i) => (
          <Link
            key={label}
            to="/profile"
            className="flex-1 flex flex-col items-center py-3 rounded hover:bg-raised transition-colors"
          >
            <span className="text-fg font-semibold text-lg leading-none">
              {i === 0 ? (user.postCount ?? '—') : '—'}
            </span>
            <span className="text-fg-muted text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
