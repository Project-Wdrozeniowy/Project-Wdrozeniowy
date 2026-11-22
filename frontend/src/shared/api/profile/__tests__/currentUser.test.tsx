import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { apiClient } from '@/shared/api/client/api';
import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';
import {
  currentUserQueryKey,
  useCurrentUser,
  useMyProfile,
} from '@/shared/api/profile/currentUser';
import { useStore } from '@/store';
import { SIGNED_IN, SIGNED_OUT, signInUser } from '@/test/session';

/**
 * The signed-in user's profile has one client copy: this cache entry. These tests read it the way
 * the header, the sidebar and the guards do (`useCurrentUser`) and the way the profile and settings
 * pages do (`useMyProfile`), against the real ApiClient with only the network faked.
 */

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;
let client: QueryClient;

const ALICE: MyProfileDto = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 2,
  commentCount: 5,
  createdAt: '2026-10-01T10:00:00.000Z',
};

/** A header and a sidebar: two readers of the signed-in user. */
function Readers() {
  const user = useCurrentUser();
  return (
    <>
      <p data-testid="header">{user ? (user.displayName ?? user.username) : 'guest'}</p>
      <p data-testid="sidebar">{user ? `${user.postCount} posts` : 'guest'}</p>
    </>
  );
}

/** The profile page: the same entry, read from the server when it opens. */
function ProfilePageReader() {
  const { data, refetch } = useMyProfile();
  return (
    <>
      <p data-testid="page">{data?.displayName}</p>
      <button type="button" onClick={() => void refetch()}>
        Refetch
      </button>
    </>
  );
}

function renderWith(children: React.ReactNode) {
  return render(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  useStore.setState({ ...SIGNED_OUT });
});

afterEach(() => {
  mock.restore();
  client.clear();
});

describe('useCurrentUser', () => {
  it('shows the user the session code put in the cache, and asks the server for nothing', () => {
    signInUser(client, ALICE);
    renderWith(<Readers />);

    expect(screen.getByTestId('header')).toHaveTextContent('Alice');
    expect(screen.getByTestId('sidebar')).toHaveTextContent('2 posts');
    expect(mock.history.get).toHaveLength(0);
  });

  it('is nobody for a guest, also when the entry is still in the cache after the session ended', () => {
    client.setQueryData(currentUserQueryKey, ALICE);
    useStore.setState({ ...SIGNED_OUT });
    renderWith(<Readers />);

    expect(screen.getByTestId('header')).toHaveTextContent('guest');
    expect(screen.getByTestId('sidebar')).toHaveTextContent('guest');
  });

  it('shows nobody while the session is being checked, and the user once it is confirmed', () => {
    client.setQueryData(currentUserQueryKey, ALICE);
    useStore.setState({ isAuthenticated: false, isInitialized: true, sessionStatus: 'checking' });
    renderWith(<Readers />);
    expect(screen.getByTestId('header')).toHaveTextContent('guest');

    act(() => useStore.setState({ ...SIGNED_IN }));

    expect(screen.getByTestId('header')).toHaveTextContent('Alice');
  });

  it('follows every write to the entry, so a saved profile reaches both readers at once', async () => {
    signInUser(client, ALICE);
    renderWith(<Readers />);

    act(() => {
      client.setQueryData(currentUserQueryKey, { ...ALICE, displayName: 'Alice A.', postCount: 3 });
    });

    await waitFor(() => expect(screen.getByTestId('header')).toHaveTextContent('Alice A.'));
    expect(screen.getByTestId('sidebar')).toHaveTextContent('3 posts');
  });
});

describe('a refetch of the profile', () => {
  it('updates the header and the sidebar too, with nothing synchronised by hand', async () => {
    mock.onGet('/users/me').replyOnce(200, ALICE);
    signInUser(client, ALICE);
    renderWith(
      <>
        <Readers />
        <ProfilePageReader />
      </>
    );
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('Alice'));

    // The server has a newer profile (an edit on another device); the page reads it again.
    mock.onGet('/users/me').reply(200, { ...ALICE, displayName: 'Alice Elsewhere', postCount: 9 });
    await act(async () => {
      screen.getByRole('button', { name: 'Refetch' }).click();
    });

    await waitFor(() => expect(screen.getByTestId('header')).toHaveTextContent('Alice Elsewhere'));
    expect(screen.getByTestId('sidebar')).toHaveTextContent('9 posts');
    expect(screen.getByTestId('page')).toHaveTextContent('Alice Elsewhere');
  });

  it('is the same single entry: the profile page and the header never hold different copies', async () => {
    mock.onGet('/users/me').reply(200, ALICE);
    signInUser(client, ALICE);
    renderWith(
      <>
        <Readers />
        <ProfilePageReader />
      </>
    );
    await waitFor(() => expect(screen.getByTestId('page')).toHaveTextContent('Alice'));

    expect(client.getQueryCache().findAll({ queryKey: currentUserQueryKey })).toHaveLength(1);
  });
});
