import { vi } from 'vitest';

const mockApiClient = { get: vi.fn() };

vi.mock('@/shared/api/client/api', () => ({ apiClient: mockApiClient }));

const { searchService } = await import('@/shared/api/search/searchClient');

describe('searchService', () => {
  beforeEach(() => mockApiClient.get.mockReset());

  it('calls only GET /search with the query, kind, page and size', async () => {
    const results = { query: 'react', posts: null, users: null, tags: null };
    mockApiClient.get.mockResolvedValue(results);
    const signal = new AbortController().signal;

    const response = await searchService.search(
      { q: 'react', type: 'TAG', page: 1, size: 10 },
      { signal }
    );

    expect(response).toBe(results);
    expect(mockApiClient.get).toHaveBeenCalledTimes(1);
    expect(mockApiClient.get).toHaveBeenCalledWith('/search', {
      params: { q: 'react', type: 'TAG', page: 1, size: 10 },
      signal,
    });
  });
});
