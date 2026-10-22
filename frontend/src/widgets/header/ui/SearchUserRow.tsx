import UserAvatar from '@/shared/ui/UserAvatar';
import type { UserSummary } from '@/shared/api/user/user.dto';

interface SearchUserRowProps {
  user: UserSummary;
}

/** A user in the dropdown. There is no public profile page yet, so the row is not a link. */
export default function SearchUserRow({ user }: SearchUserRowProps) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 text-slate-200">
      <UserAvatar {...user} />
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">
          {user.displayName?.trim() || user.username}
        </span>
        <span className="block truncate text-xs text-slate-400">@{user.username}</span>
      </span>
    </div>
  );
}
