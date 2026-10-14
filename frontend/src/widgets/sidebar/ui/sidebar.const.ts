export const NAV_LINKS = [{ href: '/profile', label: 'Profile' }] as const;

export const TRENDING_TOPICS = [
  { rank: 1, name: 'AI / Tech', color: 'bg-cat-ai' },
  { rank: 2, name: 'Gaming', color: 'bg-cat-gaming' },
  { rank: 3, name: 'Science', color: 'bg-cat-science' },
  { rank: 4, name: 'Business', color: 'bg-cat-business' },
  { rank: 5, name: 'Education', color: 'bg-cat-education' },
] as const;

export const ACTIVITY_ITEMS = [
  { color: 'bg-emerald-500', label: 'Online Users', value: '1,234' },
  { color: 'bg-blue-600', label: 'Posts per minute', value: '42' },
  { color: 'bg-amber-500', label: 'Trending Posts', value: '23' },
] as const;

export const USER_STATS = [
  { label: 'Posts' },
  { label: 'Followers' },
  { label: 'Following' },
] as const;
