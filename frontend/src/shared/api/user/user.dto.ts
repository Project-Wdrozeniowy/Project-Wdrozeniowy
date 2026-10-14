export type UserRole = 'USER' | 'MODERATOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'BANNED' | 'DEACTIVATED';

export interface UserSummary {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole;
}

export interface UserProfile {
  id: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  role: UserRole;
  status: UserStatus;
  postCount: number;
  commentCount: number;
  createdAt: string;
}

/** Own profile from `GET`/`PATCH /users/me`: the public profile plus private fields. */
export interface MyProfile extends UserProfile {
  email: string;
}

/** `PATCH /users/me`; omitted fields stay unchanged, an empty string clears the field. */
export interface UpdateProfileRequest {
  email?: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

/** `POST /users/me/password`; on success every session has to sign in again. */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}
