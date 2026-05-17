'use client';

import { usePathname } from 'next/navigation';
import { useStore } from '@/store';
import UserCard from '@/components/layout/sidebar/UserCard';
import GuestCard from '@/components/layout/sidebar/GuestCard';
import LiveActivity from '@/components/layout/sidebar/LiveActivity';
import TrendingTopics from '@/components/layout/sidebar/TrendingTopics';

export default function Sidebar() {
  const pathname = usePathname();
  const { isAuthenticated, user } = useStore();

  const initials = user ? user.username.slice(0, 2).toUpperCase() : 'U';

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
