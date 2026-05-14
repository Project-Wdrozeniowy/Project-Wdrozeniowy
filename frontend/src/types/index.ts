// API Response Types
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

// User Types
export interface User {
  id: string;
  email: string;
  name: string;
  role?: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

// Auth Types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData extends LoginCredentials {
  name: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken?: string;
}

// Forum Types
export interface Post {
  id: string;
  title: string;
  slug: string;
  content: string;
  status: string;
  pinned: boolean;
  viewCount: number;
  voteScore: number;
  commentCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
  author?: User;
}

export type CommentStatus = 'VISIBLE' | 'HIDDEN' | 'DELETED';

export interface Comment {
  id: string;
  postId: string;
  parentId: string | null;
  content: string;
  status: CommentStatus;
  voteScore: number;
  depth: number;
  author: User;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentPayload {
  content: string;
  parentId?: string | null;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  last: boolean;
}
