// ─── Pagination ───────────────────────────────────────────────────────────────

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

// ─── Errors (RFC 9457 ProblemDetail) ──────────────────────────────────────────

export interface ProblemDetail {
  type?: string;
  title?: string;
  status: number;
  detail?: string;
  instance?: string;
  /** Field-level validation errors returned by Spring Validation */
  errors?: Record<string, string>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken: string;
}

// ─── Users ────────────────────────────────────────────────────────────────────

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

export interface UpdateProfileRequest {
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

// ─── Forum – Categories ───────────────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  displayOrder: number;
  visible: boolean;
  createdAt: string;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string;
  displayOrder?: number;
  visible?: boolean;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string;
  displayOrder?: number;
  visible?: boolean;
}

// ─── Forum – Tags ─────────────────────────────────────────────────────────────

export interface Tag {
  id: number;
  name: string;
  slug: string;
  postCount: number;
}

// ─── Forum – Posts ────────────────────────────────────────────────────────────

export type PostStatus = 'PUBLISHED' | 'DRAFT' | 'LOCKED' | 'DELETED';

export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  status: PostStatus;
  pinned: boolean;
  viewCount: number;
  voteScore: number;
  commentCount: number;
  category: Category;
  author: UserSummary;
  lastActivityAt: string;
  createdAt: string;
}

export interface Post extends PostSummary {
  content: string;
  tags: Tag[];
  updatedAt: string;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  categoryId: number;
  tags?: string[];
  draft?: boolean;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  categoryId?: number;
  tags?: string[];
  status?: 'PUBLISHED' | 'DRAFT' | 'LOCKED';
}

// ─── Forum – Comments ─────────────────────────────────────────────────────────

export type CommentStatus = 'VISIBLE' | 'HIDDEN' | 'DELETED';

export interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  content: string;
  status: CommentStatus;
  voteScore: number;
  depth: number;
  author: UserSummary;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: number;
}

export interface UpdateCommentRequest {
  content: string;
}

// ─── Forum – Votes ────────────────────────────────────────────────────────────

export type VoteType = 'UP' | 'DOWN';
export type VoteEntityType = 'POST' | 'COMMENT';

export interface VoteRequest {
  entityType: VoteEntityType;
  entityId: number;
  voteType: VoteType;
}

export interface VoteResponse {
  id: number;
  entityType: VoteEntityType;
  entityId: number;
  voteType: VoteType;
  newScore: number;
  createdAt: string;
}

// ─── Notifications ────────────────────────────────────────────────────────────

export type NotificationType =
  | 'COMMENT_ON_POST'
  | 'REPLY_TO_COMMENT'
  | 'VOTE_ON_POST'
  | 'VOTE_ON_COMMENT'
  | 'MENTION'
  | 'POST_LOCKED'
  | 'SYSTEM';

export interface Notification {
  id: number;
  senderUsername: string | null;
  type: NotificationType;
  entityType: 'POST' | 'COMMENT' | null;
  entityId: number | null;
  message: string;
  read: boolean;
  createdAt: string;
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface UserActivitySummary {
  userId: number;
  username: string;
  totalPosts: number;
  totalComments: number;
  totalVotesCast: number;
  totalUpvotesReceived: number;
  totalDownvotesReceived: number;
  lastActivityAt: string | null;
}

export interface PostAnalytics {
  postId: number;
  postTitle: string;
  viewCount: number;
  uniqueViewCount: number;
  commentCount: number;
  voteScore: number;
  upvoteCount: number;
  downvoteCount: number;
  subscriptionCount: number;
}

export interface PlatformSummary {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalComments: number;
  totalVotes: number;
  totalCategories: number;
  totalTags: number;
}

// ─── Recommendations ─────────────────────────────────────────────────────────

export type RecommendationReason = 'trending' | 'similar_tags' | 'same_category' | 'personalized';

export interface RecommendedPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  voteScore: number;
  commentCount: number;
  category: Category;
  author: UserSummary;
  tags: string[];
  reason: RecommendationReason;
  createdAt: string;
}

// ─── Analytics – Time-series ──────────────────────────────────────────────────

export interface TrendDataPoint {
  date: string; // ISO date string, e.g. "2026-05-07"
  count: number;
}

export type TrendMetric = 'posts' | 'comments' | 'votes' | 'users';
export type TrendPeriod = '24h' | '7d' | '30d' | '90d';

export interface ActivityTrend {
  metric: TrendMetric;
  period: TrendPeriod;
  total: number;
  data: TrendDataPoint[];
}

// ─── AI ───────────────────────────────────────────────────────────────────────

export interface SuggestTagsRequest {
  content: string;
  title?: string;
}

export interface SuggestTagsResponse {
  tags: string[];
  aiGenerated: boolean;
}

// ─── WebSocket / STOMP ────────────────────────────────────────────────────────

/** Pushed to /topic/posts/{postId}/comments */
export interface NewCommentEvent {
  commentId: number;
  postId: number;
  parentId: number | null;
  authorUsername: string;
  content: string;
  depth: number;
  createdAt: string;
}

/** Pushed to /topic/posts/{postId}/votes */
export interface VoteScoreEvent {
  entityType: 'POST' | 'COMMENT';
  entityId: number;
  newScore: number;
}

/** Pushed to /user/queue/notifications (unicast) */
// Uses the existing Notification type from the Notifications section above

