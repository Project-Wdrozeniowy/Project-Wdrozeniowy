'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/store';
import UserCard from './ui/UserCard';
import GuestCard from './ui/GuestCard';
import LiveActivity from './ui/LiveActivity';
import TrendingTopics from './ui/TrendingTopics';

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
    <aside className="w-86 shrink-0 flex flex-col gap-3">
      {isAuthenticated && user ? (
        <UserCard user={user} initials={initials} pathname={pathname} />
      ) : (
        <GuestCard />
      )}
      <LiveActivity />
      <TrendingTopics />
    </aside>
  );
}
