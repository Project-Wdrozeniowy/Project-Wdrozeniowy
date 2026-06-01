import { apiClient } from './api';
import type {
  Category,
  CreateCategoryRequest,
  UpdateCategoryRequest,
  Post,
  PostSummary,
  CreatePostRequest,
  UpdatePostRequest,
  Comment,
  CreateCommentRequest,
  UpdateCommentRequest,
  Tag,
  VoteRequest,
  VoteResponse,
  PagedResponse,
} from '@/shared/types';

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoryService = {
  list: (): Promise<Category[]> => apiClient.get<Category[]>('/forum/categories'),

  get: (slug: string): Promise<Category> => apiClient.get<Category>(`/forum/categories/${slug}`),

  create: (data: CreateCategoryRequest): Promise<Category> =>
    apiClient.post<Category>('/forum/categories', data),

  update: (slug: string, data: UpdateCategoryRequest): Promise<Category> =>
    apiClient.patch<Category>(`/forum/categories/${slug}`, data),

  delete: (slug: string): Promise<void> => apiClient.delete<void>(`/forum/categories/${slug}`),
};

// ─── Posts ────────────────────────────────────────────────────────────────────

export interface ListPostsParams {
  page?: number;
  size?: number;
  categorySlug?: string;
  tag?: string;
  sort?: 'createdAt' | 'voteScore' | 'lastActivityAt';
  q?: string;
}

export const postService = {
  list: (params: ListPostsParams = {}): Promise<PagedResponse<PostSummary>> =>
    apiClient.get<PagedResponse<PostSummary>>('/forum/posts', { params }),

  get: (slug: string): Promise<Post> => apiClient.get<Post>(`/forum/posts/${slug}`),

  create: (data: CreatePostRequest): Promise<Post> => apiClient.post<Post>('/forum/posts', data),

  update: (slug: string, data: UpdatePostRequest): Promise<Post> =>
    apiClient.patch<Post>(`/forum/posts/${slug}`, data),

  delete: (slug: string): Promise<void> => apiClient.delete<void>(`/forum/posts/${slug}`),

  togglePin: (slug: string): Promise<Post> =>
    apiClient.patch<Post>(`/forum/posts/${slug}/pin`, null),
};

// ─── Comments ─────────────────────────────────────────────────────────────────

export const commentService = {
  list: (postSlug: string, page = 0, size = 20): Promise<PagedResponse<Comment>> =>
    apiClient.get<PagedResponse<Comment>>(`/forum/posts/${postSlug}/comments`, {
      params: { page, size },
    }),

  create: (postSlug: string, data: CreateCommentRequest): Promise<Comment> =>
    apiClient.post<Comment>(`/forum/posts/${postSlug}/comments`, data),

  update: (id: number, data: UpdateCommentRequest): Promise<Comment> =>
    apiClient.patch<Comment>(`/forum/comments/${id}`, data),

  delete: (id: number): Promise<void> => apiClient.delete<void>(`/forum/comments/${id}`),
};

// ─── Tags ─────────────────────────────────────────────────────────────────────

export const tagService = {
  list: (): Promise<Tag[]> => apiClient.get<Tag[]>('/forum/tags'),

  listPosts: (slug: string, page = 0, size = 20): Promise<PagedResponse<PostSummary>> =>
    apiClient.get<PagedResponse<PostSummary>>(`/forum/tags/${slug}/posts`, {
      params: { page, size },
    }),
};

// ─── Votes ────────────────────────────────────────────────────────────────────

export const voteService = {
  cast: (data: VoteRequest): Promise<VoteResponse> =>
    apiClient.post<VoteResponse>('/forum/votes', data),

  retract: (id: number): Promise<void> => apiClient.delete<void>(`/forum/votes/${id}`),
};
