import type { AxiosRequestConfig } from 'axios';
// Provisional adapters: category writes PWDRZ-141; comments PWDRZ-142/67;
// tags PWDRZ-143/107. Their backend controllers still return 501 and are hidden
// from OpenAPI. Mocked success fixtures are planned UI behavior, not a live contract.
import { apiClient } from '../client/api';
import type { Category, CreateCategoryRequest, UpdateCategoryRequest } from './category.dto';
import type { Post, PostSummary, CreatePostRequest, UpdatePostRequest } from './post.dto';
import type { Comment, CreateCommentRequest, UpdateCommentRequest } from './comment.dto';
import type { Tag } from './tag.dto';
import type { VoteRequest, VoteResponse } from './vote.dto';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoryService = {
  list: (config?: AxiosRequestConfig): Promise<Category[]> =>
    apiClient.get<Category[]>('/forum/categories', config),

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
  list: (
    params: ListPostsParams = {},
    config?: AxiosRequestConfig
  ): Promise<PagedResponse<PostSummary>> =>
    apiClient.get<PagedResponse<PostSummary>>('/forum/posts', { params, ...config }),

  get: (slug: string): Promise<Post> => apiClient.get<Post>(`/forum/posts/${slug}`),

  create: (data: CreatePostRequest, config?: AxiosRequestConfig): Promise<Post> =>
    apiClient.post<Post>('/forum/posts', data, config),

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
  cast: (data: VoteRequest, config?: AxiosRequestConfig): Promise<VoteResponse> =>
    apiClient.post<VoteResponse>('/forum/votes', data, config),

  retract: (id: number, config?: AxiosRequestConfig): Promise<void> =>
    apiClient.delete<void>(`/forum/votes/${id}`, config),
};
