import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SearchBar from '../SearchBar';
import { searchService } from '@/shared/api/search/searchClient';
import type { SearchResults } from '@/shared/api/search/search.dto';
import { RECENT_SEARCHES_KEY } from '@/shared/lib/recentSearches';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/shared/api/search/searchClient', () => ({
  searchService: { search: vi.fn() },
}));

const search = vi.mocked(searchService.search);

function paged<T>(content: T[]) {
  return {
    content,
    page: 0,
    size: 3,
    totalElements: content.length,
    totalPages: 1,
    first: true,
    last: true,
  };
}

function makePost(id: number, title: string) {
  return {
    id,
    title,
    slug: `post-${id}`,
    status: 'PUBLISHED' as const,
    pinned: false,
    viewCount: 0,
    voteScore: 0,
    myVote: null,
    commentCount: 0,
    category: null,
    author: { id: 1, username: 'alice', displayName: null, avatarUrl: null, role: 'USER' as const },
    lastActivityAt: '2026-10-10T10:00:00Z',
    createdAt: '2026-10-10T10:00:00Z',
  };
}

function results(overrides: Partial<SearchResults> = {}): SearchResults {
  return {
    query: 'react',
    posts: paged([makePost(1, 'React tips'), makePost(2, 'React hooks')]),
    users: paged([
      {
        id: 7,
        username: 'reactor',
        displayName: 'Rea Ctor',
        avatarUrl: null,
        role: 'USER' as const,
      },
    ]),
    tags: paged([{ id: 3, name: 'react', slug: 'react', postCount: 4 }]),
    ...overrides,
  };
}

function renderBar() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SearchBar />
    </QueryClientProvider>
  );
}

async function typeTerm(text: string) {
  const input = screen.getByRole('combobox', { name: /search posts, users and tags/i });
  await userEvent.type(input, text);
  return input;
}

describe('SearchBar', () => {
  beforeEach(() => {
    mockPush.mockReset();
    search.mockReset();
    localStorage.clear();
  });

  it('asks the API once, after the typing pauses, and shows every kind', async () => {
    search.mockResolvedValue(results());
    renderBar();

    await typeTerm('react');
    expect(search).not.toHaveBeenCalled();

    expect(await screen.findByRole('option', { name: /React tips/ })).toBeInTheDocument();
    expect(search).toHaveBeenCalledTimes(1);
    expect(search).toHaveBeenCalledWith(
      { q: 'react', size: 3 },
      expect.objectContaining({ skipErrorToast: true })
    );
    expect(screen.getByText('Rea Ctor')).toBeInTheDocument();
    expect(screen.getByText('@reactor')).toBeInTheDocument();
    expect(screen.getByText('react')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View all results' })).toHaveAttribute(
      'href',
      '/search?q=react'
    );
  });

  it('does not search for a term the API would reject', async () => {
    renderBar();
    await typeTerm('r');
    expect(await screen.findByText('Keep typing')).toBeInTheDocument();
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 400));
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('moves through the posts with the arrow keys and opens the highlighted one with Enter', async () => {
    search.mockResolvedValue(results());
    renderBar();
    const input = await typeTerm('react');
    await screen.findByRole('option', { name: /React tips/ });

    await userEvent.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', screen.getAllByRole('option')[0].id);
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowDown}');
    expect(screen.getAllByRole('option')[0]).toHaveAttribute('aria-selected', 'true');
    await userEvent.keyboard('{ArrowUp}');
    expect(screen.getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');

    await userEvent.keyboard('{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/forum/post-2');
    expect(JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) ?? '[]')).toEqual(['react']);
  });

  it('opens the results page on Enter when nothing is highlighted', async () => {
    search.mockResolvedValue(results());
    renderBar();
    await typeTerm('react ui{Enter}');
    expect(mockPush).toHaveBeenCalledWith('/search?q=react+ui');
  });

  it('does not leave for a term that is too short', async () => {
    renderBar();
    await typeTerm('r{Enter}');
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('closes on Escape and clears the input on a second Escape', async () => {
    search.mockResolvedValue(results());
    renderBar();
    const input = await typeTerm('react');
    await screen.findByRole('option', { name: /React tips/ });

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
    expect(input).toHaveValue('react');
    await userEvent.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });

  it('says so when nothing matches', async () => {
    search.mockResolvedValue({ query: 'zzz', posts: paged([]), users: paged([]), tags: paged([]) });
    renderBar();
    await typeTerm('zzz');
    expect(await screen.findByText('No results found')).toBeInTheDocument();
  });

  it('shows a fixed message on failure, never the server text, and retries', async () => {
    search.mockRejectedValueOnce(new Error('SQL exploded at 10.0.0.5'));
    renderBar();
    await typeTerm('react');

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).not.toHaveTextContent('SQL');

    search.mockResolvedValue(results());
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('option', { name: /React tips/ })).toBeInTheDocument();
  });

  it('shows no result of an older term for the current one', async () => {
    let resolveFirst: (value: SearchResults) => void = () => {};
    search.mockImplementationOnce(
      () => new Promise<SearchResults>((resolve) => (resolveFirst = resolve))
    );
    search.mockResolvedValueOnce(
      results({ posts: paged([makePost(9, 'Rust news')]), users: null, tags: null })
    );
    renderBar();

    const input = await typeTerm('react');
    await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
    await userEvent.clear(input);
    await userEvent.type(input, 'rust');

    expect(await screen.findByRole('option', { name: /Rust news/ })).toBeInTheDocument();
    await act(async () => resolveFirst(results()));
    expect(screen.queryByRole('option', { name: /React tips/ })).not.toBeInTheDocument();
  });

  it('lists recent searches when empty, and can repeat or remove one', async () => {
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(['react', 'rust']));
    renderBar();
    const input = screen.getByRole('combobox');
    fireEvent.focus(input);

    await userEvent.click(
      await screen.findByRole('button', { name: 'Remove react from recent searches' })
    );
    expect(screen.queryByRole('button', { name: 'react' })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'rust' }));
    expect(mockPush).toHaveBeenCalledWith('/search?q=rust');
  });
});
