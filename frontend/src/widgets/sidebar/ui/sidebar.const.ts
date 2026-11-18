export const NAV_LINKS = [{ href: '/profile', label: 'Profile' }] as const;

/** The sidebar reads the last seven days of public activity. */
export const SIDEBAR_PERIOD = '7d' as const;
export const SIDEBAR_PERIOD_LABEL = 'Last 7 days';
export const COMMUNITY_ACTIVITY_TITLE = 'Community activity';
export const TRENDING_TOPICS_TITLE = 'Trending Topics';
export const NO_TOPICS_TEXT = 'No public posts in the last 7 days yet.';
/** The most topics listed. */
export const TRENDING_TOPICS_LIMIT = 5;

export const USER_STATS = [
  { label: 'Posts' },
  { label: 'Followers' },
  { label: 'Following' },
] as const;
