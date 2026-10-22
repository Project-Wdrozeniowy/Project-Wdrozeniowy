import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SearchResults from '../SearchResults';
import { searchService } from '@/shared/api/search/searchClient';
import type { SearchResults as SearchResultsDto } from '@/shared/api/search/search.dto';

const mockPush = vi.fn();
const mockReplace = vi.fn();
let query = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
  useSearchParams: () => new URLSearchParams(query),
}));

vi.mock('@/shared/api/search/searchClient', () => ({
  searchService: { search: vi.fn() },
}));

const search = vi.mocked(searchService.search);

function paged<T>(content: T[], last = true, total = content.length) {
  return { content, page: 0, size: 5, totalElements: total, totalPages: 2, first: true, last };
}

function post(id: number) {
  return {
    id,
    title: `Post ${id}`,
    slug: `post-${id}`,
    status: 'PUBLISHED' as const,
    pinned: false,
    viewCount: 0,
    voteScore: 0,
    myVote: null,
    commentCount: 1,
    category: null,
    author: { id: 1, username: 'alice', displayName: null, avatarUrl: null, role: 'USER' as const },
    lastActivityAt: '2026-10-10T10:00:00Z',
    createdAt: '2026-10-10T10:00:00Z',
  };
}

function all(overrides: Partial<SearchResultsDto> = {}): SearchResultsDto {
  return {
    query: 'react',
    posts: paged([post(1)]),
    users: paged([
      { id: 7, username: 'reactor', displayName: null, avatarUrl: null, role: 'USER' as const },
    ]),
    tags: paged([{ id: 3, name: 'react', slug: 'react', postCount: 1 }]),
    ...overrides,
  };
}

function renderResults() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SearchResults />
    </QueryClientProvider>
  );
}

describe('SearchResults', () => {
  beforeEach(() => {
    mockPush.mockReset();
    mockReplace.mockReset();
    search.mockReset();
    query = '';
  });

  it('asks for a longer term instead of calling the API', () => {
    query = 'q=r';
    renderResults();
    expect(screen.getByText(/at least 2 characters/i)).toBeInTheDocument();
    expect(search).not.toHaveBeenCalled();
  });

  it('shows posts, users and tags from the URL term with the kind tabs', async () => {
    query = 'q=react';
    search.mockResolvedValue(all());
    renderResults();

    expect(await screen.findByRole('link', { name: /Post 1/ })).toHaveAttribute(
      'href',
      '/forum/post-1'
    );
    expect(search).toHaveBeenCalledWith(
      { q: 'react', type: undefined, page: 0, size: 5 },
      expect.objectContaining({ skipErrorToast: true })
    );
    expect(screen.getByText('@reactor')).toBeInTheDocument();
    expect(screen.getByText('3 results for “react”')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute(
      'href',
      '/search?q=react&type=USER'
    );
  });

  it('asks for one kind with a larger page when a tab is selected in the URL', async () => {
    query = 'q=react&type=USER';
    search.mockResolvedValue(all({ posts: null, tags: null }));
    renderResults();
    await screen.findByText('@reactor');
    expect(search).toHaveBeenCalledWith(
      { q: 'react', type: 'USER', page: 0, size: 10 },
      expect.anything()
    );
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('aria-current', 'page');
  });

  it('keeps the pages shown and raises the page in the URL on "Load more"', async () => {
    query = 'q=react&page=2';
    search.mockImplementation(async ({ page }) =>
      page === 0
        ? all({ posts: paged([post(1)], false, 2), users: null, tags: null })
        : all({ posts: paged([post(2)], true, 2), users: null, tags: null })
    );
    renderResults();

    expect(await screen.findByRole('link', { name: /Post 2/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Post 1/ })).toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: 'Load more results' })).not.toBeInTheDocument();
  });

  it('offers "Load more results" while a page is left', async () => {
    query = 'q=react';
    search.mockResolvedValue(all({ posts: paged([post(1)], false, 9), users: null, tags: null }));
    renderResults();

    await userEvent.click(await screen.findByRole('button', { name: 'Load more results' }));
    expect(mockReplace).toHaveBeenCalledWith('/search?q=react&page=2', { scroll: false });
  });

  it('says so when nothing matches', async () => {
    query = 'q=zzz';
    search.mockResolvedValue({ query: 'zzz', posts: paged([]), users: paged([]), tags: paged([]) });
    renderResults();
    expect(await screen.findByText('No results found')).toBeInTheDocument();
  });

  it('shows a fixed message on failure and retries', async () => {
    query = 'q=react';
    search.mockRejectedValueOnce(new Error('stack trace at db:5432'));
    renderResults();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).not.toHaveTextContent('db:5432');

    search.mockResolvedValue(all());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('link', { name: /Post 1/ })).toBeInTheDocument();
  });

  it('puts a new term in the URL from the form', async () => {
    query = 'q=react&type=POST';
    search.mockResolvedValue(all());
    renderResults();

    const input = screen.getByRole('searchbox', { name: /search posts, users and tags/i });
    await userEvent.clear(input);
    await userEvent.type(input, 'rust{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/search?q=rust&type=POST');
  });
});
