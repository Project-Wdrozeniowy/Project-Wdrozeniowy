import { vi } from 'vitest';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/services/api', () => ({
  apiClient: mockApiClient,
}));

const { analyticsService, recommendationService } = await import('@/services/analyticsService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('analyticsService.getMyActivity >-65 GET /analytics/me', () => {
  it('calls apiClient.get with /analytics/me', async () => {
    const data = { postCount: 10, commentCount: 5, voteCount: 20 };
    mockApiClient.get.mockResolvedValue(data);

    const result = await analyticsService.getMyActivity();

    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/me');
    expect(result).toEqual(data);
  });
});

describe('analyticsService.getPostAnalytics >-65 GET /analytics/posts/:id', () => {
  it('calls apiClient.get with /analytics/posts/:postId', async () => {
    const data = { postId: 42, views: 100, uniqueVisitors: 80 };
    mockApiClient.get.mockResolvedValue(data);

    const result = await analyticsService.getPostAnalytics(42);

    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/posts/42');
    expect(result).toEqual(data);
  });
});

describe('analyticsService.getPlatformSummary >-65 GET /analytics/summary', () => {
  it('calls apiClient.get with /analytics/summary', async () => {
    const data = { totalUsers: 500, totalPosts: 200, totalComments: 1500 };
    mockApiClient.get.mockResolvedValue(data);

    const result = await analyticsService.getPlatformSummary();

    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/summary');
    expect(result).toEqual(data);
  });
});

describe('analyticsService.getActivityTrend >-65 GET /analytics/trends', () => {
  it('calls apiClient.get with default params (posts, 7d)', async () => {
    const data = { metric: 'posts', period: '7d', total: 42, data: [] };
    mockApiClient.get.mockResolvedValue(data);

    const result = await analyticsService.getActivityTrend();

    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/trends', {
      params: { metric: 'posts', period: '7d' },
    });
    expect(result).toEqual(data);
  });

  it('passes custom metric and period', async () => {
    const data = { metric: 'users', period: '30d', total: 120, data: [] };
    mockApiClient.get.mockResolvedValue(data);

    await analyticsService.getActivityTrend('users', '30d');

    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/trends', {
      params: { metric: 'users', period: '30d' },
    });
  });
});

describe('analyticsService.getTrendingPosts >-65 GET /analytics/trending-posts', () => {
  it('calls apiClient.get with default params (24h, limit 10)', async () => {
    mockApiClient.get.mockResolvedValue([]);

    await analyticsService.getTrendingPosts();

    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/trending-posts', {
      params: { period: '24h', limit: 10 },
    });
  });

  it('passes custom period and limit', async () => {
    mockApiClient.get.mockResolvedValue([]);

    await analyticsService.getTrendingPosts('7d', 5);

    expect(mockApiClient.get).toHaveBeenCalledWith('/analytics/trending-posts', {
      params: { period: '7d', limit: 5 },
    });
  });
});

describe('recommendationService.getPosts >-65 GET /recommendations/posts', () => {
  it('calls apiClient.get with default limit', async () => {
    mockApiClient.get.mockResolvedValue([]);

    await recommendationService.getPosts();

    expect(mockApiClient.get).toHaveBeenCalledWith('/recommendations/posts', {
      params: { limit: 10 },
    });
  });

  it('passes custom limit', async () => {
    mockApiClient.get.mockResolvedValue([]);

    await recommendationService.getPosts(5);

    expect(mockApiClient.get).toHaveBeenCalledWith('/recommendations/posts', {
      params: { limit: 5 },
    });
  });
});

describe('recommendationService.getTags >-65 GET /recommendations/tags', () => {
  it('calls apiClient.get with default limit', async () => {
    mockApiClient.get.mockResolvedValue([]);

    await recommendationService.getTags();

    expect(mockApiClient.get).toHaveBeenCalledWith('/recommendations/tags', {
      params: { limit: 10 },
    });
  });

  it('passes custom limit', async () => {
    mockApiClient.get.mockResolvedValue([]);

    await recommendationService.getTags(3);

    expect(mockApiClient.get).toHaveBeenCalledWith('/recommendations/tags', {
      params: { limit: 3 },
    });
  });
});
