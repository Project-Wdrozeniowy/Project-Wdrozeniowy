// ─── API wrappers ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  data: T;
  message: string;
  status: number;
  success: boolean;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}

// ─── Enums ────────────────────────────────────────────────────────────────────

export type UserRole = 'user' | 'admin' | 'moderator';
export type UserStatus = 'active' | 'banned' | 'suspended';
export type PostStatus = 'draft' | 'published' | 'archived' | 'removed';
export type CommentStatus = 'active' | 'removed' | 'flagged';
export type VoteType = 'up' | 'down';

export enum CategoryKey {
  AI = 'ai',
  GAMING = 'gaming',
  POLITICS = 'politics',
  SCIENCE = 'science',
  BUSINESS = 'business',
  EDUCATION = 'education',
  NEWS = 'news',
}

// ─── Users ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  role: UserRole;
  status: UserStatus;
  banReason?: string;
  emailVerifiedAt?: string;
  postCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  displayName: string;
  interests?: CategoryKey[];
}

/** Minimal user shape returned by auth endpoints (login, register, refresh, me). */
export interface AuthUserInfo {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}

/** Response from POST /auth/login, POST /auth/register, POST /auth/refresh, GET /auth/me. */
export interface AuthResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: AuthUserInfo;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  displayOrder: number;
  isVisible: boolean;
  createdAt: string;
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export interface Tag {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

// ─── Posts ────────────────────────────────────────────────────────────────────

export interface Post {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  slug: string;
  content: string;
  status: PostStatus;
  isPinned: boolean;
  viewCount: number;
  voteScore: number;
  commentCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
  category?: Category;
  tags?: Tag[];
}

// ─── Comments ─────────────────────────────────────────────────────────────────

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  parentId?: string;
  content: string;
  status: CommentStatus;
  voteScore: number;
  depth: number;
  createdAt: string;
  updatedAt: string;
  author?: User;
  replies?: Comment[];
}

// ─── Votes ────────────────────────────────────────────────────────────────────

export interface Vote {
  id: string;
  userId: string;
  postId?: string;
  commentId?: string;
  voteType: VoteType;
  createdAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  recipientId: string;
  senderId?: string;
  type: string;
  entityType: string;
  entityId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  sender?: User;
}

// ─── Activity events ──────────────────────────────────────────────────────────

export interface ActivityEvent {
  id: string;
  userId: string;
  eventType: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// ─── Post subscriptions ───────────────────────────────────────────────────────

export interface PostSubscription {
  userId: string;
  postId: string;
  createdAt: string;
}

// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
