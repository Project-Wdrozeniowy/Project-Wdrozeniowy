import Link from 'next/link';
import type { User } from '@/shared/types';
import { NAV_LINKS, USER_STATS } from '@/constants/sidebar';

interface Props {
  user: User;
  initials: string;
  pathname: string;
}

export default function UserCard({ user, initials, pathname }: Props) {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <Link href="/profile" className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-900 font-semibold text-base shrink-0">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-gray-50 font-semibold text-sm truncate">
            {user.displayName || user.username}
          </p>
          <p className="text-slate-300 text-xs">@{user.username}</p>
        </div>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV_LINKS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center px-3 py-2.5 rounded text-sm transition-colors ${
                active ? 'bg-slate-700 text-gray-50' : 'text-white hover:bg-slate-700'
              }`}
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
            href="/profile"
            className="flex-1 flex flex-col items-center py-3 rounded hover:bg-slate-700 transition-colors"
          >
            <span className="text-white font-semibold text-lg leading-none">
              {i === 0 ? (user.postCount ?? '—') : '—'}
            </span>
            <span className="text-slate-300 text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
