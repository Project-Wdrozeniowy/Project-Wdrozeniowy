import type { UserRole } from '@/shared/api/user/user.dto';

export const PROFILE_LOAD_ERROR_MESSAGE = 'We could not load your profile. Please try again.';

/** The role as shown to the user; the API value is an identifier, not display text. */
export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Member',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};
