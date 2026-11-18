/** What the signed-in user can open from the sidebar card. Every one is a page the app has. */
export const NAV_LINKS = [
  { href: '/profile', label: 'Profile' },
  { href: '/notifications', label: 'Notifications' },
  { href: '/settings', label: 'Settings' },
] as const;

/** The sidebar reads the last seven days of public activity. */
export const SIDEBAR_PERIOD = '7d' as const;
export const SIDEBAR_PERIOD_LABEL = 'Last 7 days';
export const COMMUNITY_ACTIVITY_TITLE = 'Community activity';
export const TRENDING_TOPICS_TITLE = 'Trending Topics';
export const NO_TOPICS_TEXT = 'No public posts in the last 7 days yet.';
/** The most topics listed. */
export const TRENDING_TOPICS_LIMIT = 5;
