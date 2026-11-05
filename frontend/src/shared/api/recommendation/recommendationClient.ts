// PROVISIONAL PWDRZ-146: both backend operations remain hidden 501 stubs.
// These planned adapters do not certify a live recommendation contract or UI.
import { apiClient } from '@/shared/api/client/api';
import type { TagDto as Tag } from '@/shared/api/generated/models/tagDto.dto';
import type { RecommendedPost } from './recommendation.dto';

export const recommendationService = {
  getPosts: (limit = 10): Promise<RecommendedPost[]> =>
    apiClient.get<RecommendedPost[]>('/recommendations/posts', { params: { limit } }),

  getTags: (limit = 10): Promise<Tag[]> =>
    apiClient.get<Tag[]>('/recommendations/tags', { params: { limit } }),
};
