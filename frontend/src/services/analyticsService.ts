import { apiClient } from './api';
import type {
  UserActivitySummary,
  PostAnalytics,
  PlatformSummary,
  ActivityTrend,
  TrendMetric,
  TrendPeriod,
  RecommendedPost,
  PostSummary,
  Tag,
} from '../types';

export const analyticsService = {
  getMyActivity: (): Promise<UserActivitySummary> =>
    apiClient.get<UserActivitySummary>('/analytics/me'),

  getPostAnalytics: (postId: number): Promise<PostAnalytics> =>
    apiClient.get<PostAnalytics>(`/analytics/posts/${postId}`),

  getPlatformSummary: (): Promise<PlatformSummary> =>
    apiClient.get<PlatformSummary>('/analytics/summary'),

  getActivityTrend: (metric: TrendMetric = 'posts', period: TrendPeriod = '7d'): Promise<ActivityTrend> =>
    apiClient.get<ActivityTrend>('/analytics/trends', { params: { metric, period } }),

  getTrendingPosts: (period: '24h' | '7d' | '30d' = '24h', limit = 10): Promise<PostSummary[]> =>
    apiClient.get<PostSummary[]>('/analytics/trending-posts', { params: { period, limit } }),
};

export const recommendationService = {
  getPosts: (limit = 10): Promise<RecommendedPost[]> =>
    apiClient.get<RecommendedPost[]>('/recommendations/posts', { params: { limit } }),

  getTags: (limit = 10): Promise<Tag[]> =>
    apiClient.get<Tag[]>('/recommendations/tags', { params: { limit } }),
};
