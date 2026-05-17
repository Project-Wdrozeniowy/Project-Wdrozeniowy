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

const { aiService } = await import('@/services/aiService');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('aiService.suggestTags >-65 POST /ai/suggest-tags', () => {
  it('calls apiClient.post with /ai/suggest-tags and content', async () => {
    const request = { content: 'A detailed post about TypeScript generics and advanced types' };
    const response = { tags: ['typescript', 'generics', 'advanced'], aiGenerated: true };
    mockApiClient.post.mockResolvedValue(response);

    const result = await aiService.suggestTags(request);

    expect(mockApiClient.post).toHaveBeenCalledWith('/ai/suggest-tags', request);
    expect(result).toEqual(response);
  });

  it('passes optional title along with content', async () => {
    const request = { content: 'A post discussing React performance optimizations', title: 'React' };
    const response = { tags: ['react', 'performance'], aiGenerated: true };
    mockApiClient.post.mockResolvedValue(response);

    const result = await aiService.suggestTags(request);

    expect(mockApiClient.post).toHaveBeenCalledWith('/ai/suggest-tags', request);
    expect(result.aiGenerated).toBe(true);
    expect(result.tags).toContain('react');
  });

  it('returns empty tag list when no relevant tags found', async () => {
    const request = { content: 'A very generic post with no specific topic' };
    const response = { tags: [], aiGenerated: true };
    mockApiClient.post.mockResolvedValue(response);

    const result = await aiService.suggestTags(request);

    expect(result.tags).toHaveLength(0);
  });
});
