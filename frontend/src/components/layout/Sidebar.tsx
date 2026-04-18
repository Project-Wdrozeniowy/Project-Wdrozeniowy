'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';

const NAV_LINKS = [
  { href: '/profile', label: 'Profile', badge: null },
  { href: '/notifications', label: 'Notifications', badge: 12 },
  { href: '/messages', label: 'Messages', badge: 5 },
  { href: '/saved', label: 'Saved Posts', badge: 24 },
  { href: '/stats', label: 'Your Stats', badge: null },
  { href: '/achievements', label: 'Achievements', badge: 8 },
  { href: '/settings', label: 'Settings', badge: null },
];

const TRENDING_TOPICS = [
  { rank: 1, name: 'AI / Tech', color: 'bg-blue-500' },
  { rank: 2, name: 'Gaming', color: 'bg-green-500' },
  { rank: 3, name: 'Science', color: 'bg-violet-500' },
  { rank: 4, name: 'Business', color: 'bg-amber-500' },
  { rank: 5, name: 'Education', color: 'bg-teal-500' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useStore();

  const initials = user
    ? (user.displayName || user.username)
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : 'U';

  return (
    <aside className="w-[344px] shrink-0 flex flex-col gap-3">
      {/* User card */}
      {isAuthenticated && user ? (
        <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-4">
          {/* Avatar + name */}
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

          {/* Nav links */}
          <nav className="flex flex-col gap-0.5">
            {NAV_LINKS.map(({ href, label, badge }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center justify-between px-3 py-2.5 rounded text-sm transition-colors ${
                    active
                      ? 'bg-slate-700 text-gray-50'
                      : 'text-white hover:bg-slate-700'
                  }`}
                >
                  <span>{label}</span>
                  {badge !== null && (
                    <span className="text-xs font-semibold bg-slate-600 text-white px-2 py-0.5 rounded">
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Stats row */}
          <div className="flex gap-2">
            {[
              { value: user.postCount, label: 'Posts' },
              { value: '—', label: 'Followers' },
              { value: '—', label: 'Following' },
            ].map(({ value, label }) => (
              <Link
                key={label}
                href="/profile"
                className="flex-1 flex flex-col items-center py-3 rounded hover:bg-slate-700 transition-colors"
              >
                <span className="text-white font-semibold text-lg leading-none">
                  {value}
                </span>
                <span className="text-slate-300 text-xs mt-1">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        /* Guest card */
        <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-3">
          <p className="text-gray-50 font-semibold text-sm">
            Join the community
          </p>
          <p className="text-slate-400 text-xs">
            Sign in to save posts, vote, and personalize your feed.
          </p>
          <div className="flex gap-2">
            <Link
              href="/login"
              className="flex-1 text-center py-2 rounded text-sm font-semibold text-gray-50 bg-slate-700 hover:bg-slate-600 transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/register"
              className="flex-1 text-center py-2 rounded text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              Sign up
            </Link>
          </div>
        </div>
      )}

      {/* Live Activity */}
      <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-4">
        <h2 className="text-gray-50 font-semibold text-xl leading-none">
          Live Activity
        </h2>
        <div className="flex flex-col gap-2">
          <ActivityRow
            color="bg-emerald-500"
            label="Online Users"
            value="1,234"
          />
          <ActivityRow
            color="bg-blue-600"
            label="Posts per minute"
            value="42"
          />
          <ActivityRow
            color="bg-amber-500"
            label="Trending Posts"
            value="23"
          />
        </div>
      </div>

      {/* Trending Topics */}
      <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-4">
        <h2 className="text-gray-50 font-semibold text-xl leading-none">
          Trending Topics
        </h2>
        <div className="flex flex-col gap-0.5">
          {TRENDING_TOPICS.map(({ rank, name, color }) => (
            <Link
              key={name}
              href={`/forum?topic=${name.toLowerCase().replace('/', '-').replace(' ', '-')}`}
              className="flex items-center justify-between py-2 group"
            >
              <div className="flex items-center gap-3">
                <span className="text-slate-400 font-bold text-xl w-4 text-center">
                  {rank}
                </span>
                <span className={`w-3 h-3 rounded-full ${color} shrink-0`} />
                <span className="text-gray-50 text-sm group-hover:text-blue-400 transition-colors">
                  {name}
                </span>
              </div>
              <ChevronIcon />
            </Link>
          ))}
        </div>
      </div>
    </aside>
  );
}

function ActivityRow({
  color,
  label,
  value,
}: {
  color: string;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div className={`w-8 h-8 rounded-full ${color} flex items-center justify-center shrink-0`}>
          <span className="w-2 h-2 rounded-full bg-white opacity-80" />
        </div>
        <span className="text-gray-50 text-sm">{label}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
        <span className="text-gray-50 font-semibold text-base">{value}</span>
      </div>
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}
