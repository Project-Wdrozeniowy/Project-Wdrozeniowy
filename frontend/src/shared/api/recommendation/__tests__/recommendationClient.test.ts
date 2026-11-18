// PROVISIONAL PWDRZ-146: preserved planned adapter fixtures, not proof of implemented endpoints.
import { vi } from 'vitest';
import { recommendationService } from '@/shared/api/recommendation/recommendationClient';

const mockApiClient = vi.hoisted(() => ({ get: vi.fn() }));

vi.mock('@/shared/api/client/api', () => ({ apiClient: mockApiClient }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('recommendationService.getPosts > GET /recommendations/posts', () => {
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

describe('recommendationService.getTags > GET /recommendations/tags', () => {
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
