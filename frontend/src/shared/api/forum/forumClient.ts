// Provisional adapters: category writes PWDRZ-141; comments PWDRZ-142/67;
// tags PWDRZ-143/107. Their backend controllers still return 501 and are hidden
// from OpenAPI. Mocked success fixtures are planned UI behavior, not a live contract.
import { apiClient } from '@/shared/api/client/api';
import type { CategoryDto as Category } from '@/shared/api/generated/models/categoryDto.dto';
import type { CreateCategoryRequest, UpdateCategoryRequest } from './category.dto';
import type { PostSummaryDto as PostSummary } from '@/shared/api/generated/models/postSummaryDto.dto';
import type { Comment, CreateCommentRequest, UpdateCommentRequest } from './comment.dto';
import type { TagDto as Tag } from '@/shared/api/generated/models/tagDto.dto';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';

// ─── Categories ───────────────────────────────────────────────────────────────

export const categoryService = {
  create: (data: CreateCategoryRequest): Promise<Category> =>
    apiClient.post<Category>('/forum/categories', data),

  update: (slug: string, data: UpdateCategoryRequest): Promise<Category> =>
    apiClient.patch<Category>(`/forum/categories/${slug}`, data),

  delete: (slug: string): Promise<void> => apiClient.delete<void>(`/forum/categories/${slug}`),
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
