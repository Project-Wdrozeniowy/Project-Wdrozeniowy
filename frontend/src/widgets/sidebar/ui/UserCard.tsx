import { Link } from 'react-router';
import type { UserProfileDto as UserProfile } from '@/shared/api/generated/models/userProfileDto.dto';
import { useUnreadNotificationCount } from '@/shared/api/notifications/useUnreadNotificationCount';
import { UNREAD_BADGE_MAX } from '@/shared/api/notifications/notification.const';
import { cn } from '@/shared/lib/cn';
import { isActiveLink } from '@/shared/lib/isActiveLink';
import { PAGE_ICONS } from '@/shared/ui/pageIcons';
import { NAV_LINKS } from '@/widgets/sidebar/ui/sidebar.const';

interface UserCardProps {
  user: UserProfile;
  initials: string;
  pathname: string;
}

export default function UserCard({ user, initials, pathname }: UserCardProps) {
  const unread = useUnreadNotificationCount().data ?? 0;

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

      <nav aria-label="Your account" className="flex flex-col gap-0.5">
        {NAV_LINKS.map(({ href, label }) => {
          const active = isActiveLink(pathname, href);
          const Icon = PAGE_ICONS[href];
          return (
            <Link
              key={href}
              to={href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex items-center justify-between px-3 py-2.5 rounded text-sm transition-colors focus-visible:outline-2 focus-visible:outline-blue-500',
                active ? 'bg-raised text-fg' : 'text-fg hover:bg-raised'
              )}
            >
              <span className="flex items-center gap-3">
                {Icon && <Icon />}
                {label}
              </span>
              {href === '/notifications' && unread > 0 && (
                <span className="min-w-5 h-5 px-1.5 rounded-full bg-red-500 text-white text-[11px] font-bold leading-5 text-center">
                  <span aria-hidden="true">
                    {unread > UNREAD_BADGE_MAX ? `${UNREAD_BADGE_MAX}+` : unread}
                  </span>
                  <span className="sr-only">{unread} unread</span>
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Only what the platform counts for this user; there are no followers yet. */}
      <dl className="flex gap-2">
        {[
          { label: 'Posts', value: user.postCount },
          { label: 'Comments', value: user.commentCount },
        ]
          // A count the profile does not carry is left out, not shown as 0 and not a crash.
          .filter(({ value }) => typeof value === 'number')
          .map(({ label, value }) => (
            <div key={label} className="flex-1 flex flex-col-reverse items-center py-3">
              <dt className="text-fg-muted text-xs mt-1">{label}</dt>
              <dd className="text-fg font-semibold text-lg leading-none">
                {value.toLocaleString('en-US')}
              </dd>
            </div>
          ))}
      </dl>
    </div>
  );
}
