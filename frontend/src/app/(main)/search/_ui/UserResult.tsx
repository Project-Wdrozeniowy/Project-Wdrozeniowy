import UserAvatar from '@/shared/ui/UserAvatar';
import type { UserSummary } from '@/shared/api/user/user.dto';

/** There is no public profile page yet, so a user is shown but not linked. */
export default function UserResult({ user }: { user: UserSummary }) {
  return (
    <li className="flex items-center gap-3 px-4 py-3">
      <UserAvatar {...user} />
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">
          {user.displayName?.trim() || user.username}
        </p>
        <p className="text-xs text-slate-400 truncate">@{user.username}</p>
      </div>
    </li>
  );
}
