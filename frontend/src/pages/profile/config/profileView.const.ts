import type { UserProfileDtoRole as UserRole } from '@/shared/api/generated/models/userProfileDtoRole.dto';

/** The role as shown to the user; the API value is an identifier, not display text. */
export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Member',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};

/** Names the profile skeleton for assistive technology. */
export const PROFILE_LOADING_LABEL = 'Loading your profile';

export const PROFILE_POSTS_TITLE = 'Posts';
export const PROFILE_POSTS_ERROR_TEXT = 'We could not load your posts. Please try again.';
export const PROFILE_POSTS_REFRESH_ERROR_TEXT =
  'We could not refresh your posts. What you see may be out of date.';
export const PROFILE_POSTS_EMPTY_TEXT = 'You have not published a post yet.';
export const PROFILE_POSTS_LOADING_LABEL = 'Loading your posts';
export const PROFILE_TABS_LABEL = 'Profile sections';
export const PROFILE_TAB_UNAVAILABLE_LABEL = 'Not available yet';

/** The query parameter that holds the open section, so a reload and a shared link keep it. */
export const PROFILE_TAB_PARAM = 'tab';

/**
 * The sections of the design. PROVISIONAL: only some have an API behind them; the rest are shown,
 * cannot be opened, and say so (a section with nothing to load must not look like it is loading).
 *
 * - posts: `GET /forum/posts?author=`.
 * - activity: the totals of `GET /analytics/me`. The activity chart over time needs a per-day
 *   series of the user's own activity that the API does not have; it belongs to PWDRZ-153.
 * - comments: there is no endpoint that lists a user's comments (`/forum/comments/{id}` only edits
 *   or deletes one). There is no ticket for it yet; it is a backend/product decision.
 * - saved: there is no bookmark endpoint, so nothing is saved anywhere (the Save buttons on posts
 *   are unavailable for the same reason). There is no ticket for it yet.
 *
 * When one of these exists: make its entry `available`, load it with the shared query states
 * (`QueryState`: loading, a truthful empty text, a retryable error), and drop its note here.
 */
export const PROFILE_TABS = [
  { id: 'posts', label: 'Posts', available: true },
  { id: 'comments', label: 'Comments', available: false },
  { id: 'saved', label: 'Saved', available: false },
  { id: 'activity', label: 'Activity', available: true },
] as const;
export type ProfileTabId = (typeof PROFILE_TABS)[number]['id'];
export const DEFAULT_PROFILE_TAB: ProfileTabId = 'posts';

/** The design's last entry: not a section but the way to the settings. */
export const PROFILE_SETTINGS_LINK = { label: 'Settings', to: '/settings' } as const;

export const PROFILE_VOTES_LOADING_LABEL = 'Loading your vote totals';
export const PROFILE_VOTES_ERROR_TEXT = 'We could not load your vote totals. Please try again.';
export const PROFILE_ACTIVITY_TITLE = 'Your activity';
export const PROFILE_ACTIVITY_LOADING_LABEL = 'Loading your activity';
export const PROFILE_ACTIVITY_ERROR_TEXT = 'We could not load your activity. Please try again.';
export const PROFILE_ACTIVITY_CHART_TEXT =
  'Your activity over time is not available yet. These are your totals so far.';
export const PROFILE_NO_ACTIVITY_TEXT = 'No activity yet';
export const PROFILE_LAST_ACTIVE_UNKNOWN_TEXT = 'Unknown';
export const PROFILE_LAST_ACTIVE_LABEL = 'Last active';
/** The profile page, and the query parameter of each open section lives next to `parseProfileTab`. */
export const PROFILE_PATH = '/profile';
export const PROFILE_FIGURE_LABELS = {
  posts: 'Posts',
  comments: 'Comments',
  upvotesReceived: 'Upvotes received',
  downvotesReceived: 'Downvotes received',
  votesCast: 'Votes cast',
} as const;
