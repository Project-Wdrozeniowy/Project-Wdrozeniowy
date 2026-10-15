import { act, render, renderHook, screen } from '@testing-library/react';
import { QueryObserver, useQueryClient } from '@tanstack/react-query';
import QueryProvider from '../QueryProvider';
import { useStore } from '@/store';

// next/dynamic is not supported in vitest jsdom – mock it to render nothing
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

describe('QueryProvider >-65', () => {
  it('renders children', () => {
    render(
      <QueryProvider>
        <div data-testid="child">child content</div>
      </QueryProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('children can access QueryClient context', () => {
    function Consumer() {
      const client = useQueryClient();
      return <span data-testid="has-client">{client ? 'yes' : 'no'}</span>;
    }

    render(
      <QueryProvider>
        <Consumer />
      </QueryProvider>
    );

    expect(screen.getByTestId('has-client')).toHaveTextContent('yes');
  });

  it('renders multiple children', () => {
    render(
      <QueryProvider>
        <div data-testid="a">A</div>
        <div data-testid="b">B</div>
      </QueryProvider>
    );
    expect(screen.getByTestId('a')).toBeInTheDocument();
    expect(screen.getByTestId('b')).toBeInTheDocument();
  });
});

describe('QueryProvider cache and sign-out', () => {
  function captureClient() {
    const { result } = renderHook(() => useQueryClient(), { wrapper: QueryProvider });
    return result.current;
  }

  afterEach(() => {
    useStore.setState({ user: null, isAuthenticated: false });
  });

  it('drops every cached query when the user signs out, so the next user never sees them', () => {
    useStore.setState({ isAuthenticated: true });
    const client = captureClient();
    client.setQueryData(['my-profile', 1], { email: 'private@example.com' });

    act(() => useStore.getState().logout());

    expect(client.getQueryData(['my-profile', 1])).toBeUndefined();
  });

  it('drops the cache when another account replaces the session without a sign-out', () => {
    useStore.setState({ isAuthenticated: true, user: { id: 1 } as never });
    const client = captureClient();
    client.setQueryData(['anything-per-user'], 'account 1 data');

    act(() => useStore.setState({ user: { id: 2 } as never }));

    expect(client.getQueryData(['anything-per-user'])).toBeUndefined();
  });

  it('keeps the cache when the same user is updated (a profile edit or a session refresh)', () => {
    useStore.setState({ isAuthenticated: true, user: { id: 1, displayName: 'A' } as never });
    const client = captureClient();
    client.setQueryData(['anything-per-user'], 'account 1 data');

    act(() => useStore.setState({ user: { id: 1, displayName: 'B' } as never }));

    expect(client.getQueryData(['anything-per-user'])).toBe('account 1 data');
  });

  it('keeps the cache while the session stays signed in', () => {
    useStore.setState({ isAuthenticated: true });
    const client = captureClient();
    client.setQueryData(['forum-posts'], 'cached');

    act(() => useStore.setState({ isInitialized: true }));

    expect(client.getQueryData(['forum-posts'])).toBe('cached');
  });

  it('does not clear anything when a guest signs in', () => {
    const client = captureClient();
    client.setQueryData(['forum-categories'], 'public data');

    act(() => useStore.setState({ isAuthenticated: true }));

    expect(client.getQueryData(['forum-categories'])).toBe('public data');
  });

  it("resets the cached feed when a guest signs in, so the user's own votes show", () => {
    const client = captureClient();
    client.setQueryData(['forum-posts', { page: 1 }], 'guest page that is not on screen');

    act(() => useStore.setState({ user: { id: 1 } as never, isAuthenticated: true }));

    expect(client.getQueryData(['forum-posts', { page: 1 }])).toBeUndefined();
  });

  it('keeps a feed page that is on screen in place and marks it stale', () => {
    const client = captureClient();
    const unsubscribe = new QueryObserver(client, {
      queryKey: ['forum-posts', { page: 0 }],
      queryFn: () => new Promise(() => {}),
      initialData: 'page',
      staleTime: Infinity,
    }).subscribe(() => {});

    act(() => useStore.setState({ user: { id: 1 } as never, isAuthenticated: true }));

    expect(client.getQueryData(['forum-posts', { page: 0 }])).toBe('page');
    expect(client.getQueryState(['forum-posts', { page: 0 }])?.isInvalidated).toBe(true);
    unsubscribe();
  });

  it('keeps the feed for an update of an already signed-in user', () => {
    useStore.setState({ user: { id: 1 } as never, isAuthenticated: true });
    const client = captureClient();
    client.setQueryData(['forum-posts', { page: 0 }], 'page');

    act(() => useStore.setState({ user: { id: 1, displayName: 'New' } as never }));

    expect(client.getQueryData(['forum-posts', { page: 0 }])).toBe('page');
  });
});
