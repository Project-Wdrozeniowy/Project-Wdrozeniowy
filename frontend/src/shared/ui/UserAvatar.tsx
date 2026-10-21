import { isHttpUrl } from '@/shared/lib/url';

const AVATAR_COLORS = ['bg-violet-500', 'bg-emerald-500', 'bg-blue-500', 'bg-amber-500'] as const;

interface UserAvatarProps {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** Side in px. */
  size?: number;
}

/** Round avatar: the picture when there is a usable one, otherwise the initials. */
export default function UserAvatar({
  id,
  username,
  displayName,
  avatarUrl,
  size = 32,
}: UserAvatarProps) {
  const label = displayName?.trim() || username;
  const style = { width: size, height: size };

  if (avatarUrl && isHttpUrl(avatarUrl)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- user-provided URL on any host
      <img
        src={avatarUrl}
        alt=""
        referrerPolicy="no-referrer"
        style={style}
        className="rounded-full object-cover shrink-0"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      style={style}
      className={`${AVATAR_COLORS[id % AVATAR_COLORS.length]} rounded-full shrink-0 flex items-center justify-center text-white text-xs font-semibold`}
    >
      {label.slice(0, 2).toUpperCase()}
    </span>
  );
}
