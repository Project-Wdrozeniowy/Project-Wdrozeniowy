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

/** The tabs of the design. Only the posts have an API behind them; the others are shown, not open. */
export const PROFILE_TABS = [
  { id: 'posts', label: 'Posts', available: true },
  { id: 'comments', label: 'Comments', available: false },
  { id: 'saved', label: 'Saved', available: false },
  { id: 'activity', label: 'Activity', available: false },
] as const;
