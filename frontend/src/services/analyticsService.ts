import { apiClient } from './api';
import type {
  UserActivitySummary,
  PostAnalytics,
  PlatformSummary,
  RecommendedPost,
  Tag,
} from '../types';

export const analyticsService = {
  getMyActivity: (): Promise<UserActivitySummary> =>
    apiClient.get<UserActivitySummary>('/analytics/me'),

  getPostAnalytics: (postId: number): Promise<PostAnalytics> =>
    apiClient.get<PostAnalytics>(`/analytics/posts/${postId}`),

  getPlatformSummary: (): Promise<PlatformSummary> =>
    apiClient.get<PlatformSummary>('/analytics/summary'),
};

export const recommendationService = {
  getPosts: (limit = 10): Promise<RecommendedPost[]> =>
    apiClient.get<RecommendedPost[]>('/recommendations/posts', { params: { limit } }),

  getTags: (limit = 10): Promise<Tag[]> =>
    apiClient.get<Tag[]>('/recommendations/tags', { params: { limit } }),
};
