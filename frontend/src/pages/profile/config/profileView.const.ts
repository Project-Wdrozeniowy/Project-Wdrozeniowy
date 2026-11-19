import type { UserProfileDtoRole as UserRole } from '@/shared/api/generated/models/userProfileDtoRole.dto';

/** The role as shown to the user; the API value is an identifier, not display text. */
export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Member',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};

/** Names the profile skeleton for assistive technology. */
export const PROFILE_LOADING_LABEL = 'Loading your profile';

/**
 * The posts list on the profile has no content yet (PWDRZ-60), so its placeholder says it is not
 * available instead of claiming to load.
 */
export const PROFILE_POSTS_UNAVAILABLE_LABEL = 'Your posts are not available yet.';
