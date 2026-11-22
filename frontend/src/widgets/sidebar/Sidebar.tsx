import { useLocation } from 'react-router';
import { useCurrentUser } from '@/shared/api/profile/currentUser';
import { useStore } from '@/store';
import UserCard from './ui/UserCard';
import GuestCard from './ui/GuestCard';
import CommunityActivity from './ui/CommunityActivity';
import TrendingTopics from './ui/TrendingTopics';

export default function Sidebar() {
  const pathname = useLocation().pathname;
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const user = useCurrentUser();

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
      <CommunityActivity />
      <TrendingTopics />
    </aside>
  );
}
