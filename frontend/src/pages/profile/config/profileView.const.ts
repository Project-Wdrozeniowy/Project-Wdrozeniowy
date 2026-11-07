import type { UserProfileDtoRole as UserRole } from '@/shared/api/generated/models/userProfileDtoRole.dto';

/** The role as shown to the user; the API value is an identifier, not display text. */
export const ROLE_LABELS: Record<UserRole, string> = {
  USER: 'Member',
  MODERATOR: 'Moderator',
  ADMIN: 'Admin',
};
