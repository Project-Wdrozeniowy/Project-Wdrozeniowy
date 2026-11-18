import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { AxiosInstance } from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { vi } from 'vitest';
import ProfileForm from '@/features/edit-profile/ProfileForm';
import { PROFILE_FIELDS } from '@/features/edit-profile/profile.const';
import { toast } from '@/shared/lib/toast';
import { apiClient } from '@/shared/api/client/api';
import { useStore } from '@/store';
import { sessionEvents } from '@/shared/auth/sessionEvents';
import { useUpdateProfile } from '@/shared/api/profile/useUpdateProfile';
import { myProfileQueryKey, useMyProfile } from '@/shared/api/profile/useMyProfile';
import type { MyProfileDto as MyProfile } from '@/shared/api/generated/models/myProfileDto.dto';

/**
 * ProfileForm -> hooks -> userService -> the real ApiClient (axios + interceptors).
 * Only the network is faked, so request bodies, the error handling of the shared client and the
 * session handling are covered end to end.
 */

vi.mock('@/shared/lib/toast', () => ({
  API_ERROR_TOAST_ID: 'api-error',
  toast: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn() },
}));

/** Shape captured from GET /api/users/me on the real backend. */
const PROFILE: MyProfile = {
  id: 1,
  username: 'alice',
  email: 'alice@example.com',
  displayName: 'Alice',
  avatarUrl: null,
  bio: 'Hello there',
  role: 'USER',
  status: 'ACTIVE',
  postCount: 2,
  commentCount: 5,
  createdAt: '2026-10-01T10:00:00.000Z',
};

const axiosInstance = (apiClient as unknown as { client: AxiosInstance }).client;
let mock: MockAdapter;

/**
 * The form with every field, next to a consumer of the same cache (the heading), as the profile
 * page and the settings page are: a save must show up in both.
 */
function ProfileFormHarness() {
  const { data } = useMyProfile();
  if (!data) return null;
  return (
    <>
      <h1>{data.displayName || data.username}</h1>
      <p>{data.postCount} Posts</p>
      <ProfileForm profile={data} fields={PROFILE_FIELDS} title="Account settings" />
    </>
  );
}

function renderView(client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) {
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <ProfileFormHarness />
      </QueryClientProvider>
    ),
  };
}

function lastPatchBody() {
  return JSON.parse(mock.history.patch[mock.history.patch.length - 1].data);
}

const input = (name: string) => screen.getByLabelText(name) as HTMLInputElement;
const saveButton = () => screen.getByRole('button', { name: /Save changes|Saving…/ });

async function loaded() {
  await screen.findByRole('heading', { level: 1 });
}

beforeEach(() => {
  vi.clearAllMocks();
  mock = new MockAdapter(axiosInstance);
  apiClient.clearCsrf();
  mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  apiClient.setUnauthorizedHandler(undefined);
  useStore.setState({ user: PROFILE, isAuthenticated: true, isInitialized: true });
  Object.defineProperty(window, 'location', {
    writable: true,
    value: { ...window.location, href: '/profile' },
  });
});

afterEach(() => {
  mock.restore();
});

it('cannot restore the previous account after a profile save waits for cache cancellation', async () => {
  mock.onPatch('/users/me').reply(200, { ...PROFILE, displayName: 'Saved Alice' });
  const client = new QueryClient();
  let finishCancellation!: () => void;
  const cancellation = vi.spyOn(client, 'cancelQueries').mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finishCancellation = resolve;
      })
  );
  const { result } = renderHook(() => useUpdateProfile(), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  });
  let saving!: Promise<MyProfile>;
  act(() => {
    saving = result.current.mutateAsync({ data: { displayName: 'Saved Alice' } });
  });
  await waitFor(() => expect(finishCancellation).toBeDefined());
  const bob = { ...PROFILE, id: 2, username: 'bob', email: 'bob@example.com', displayName: 'Bob' };
  act(() => {
    sessionEvents.advance();
    useStore.getState().setAuth(bob);
    finishCancellation();
  });
  await act(async () => {
    await saving;
  });
  expect(useStore.getState().user).toEqual(bob);
  expect(client.getQueryData(myProfileQueryKey(PROFILE.id))).toBeUndefined();
  cancellation.mockRestore();
  client.clear();
});

describe('saving changes', () => {
  beforeEach(() => {
    mock.onGet('/users/me').reply(200, PROFILE);
  });

  it('disables Save and Discard until something changes', async () => {
    renderView();
    await loaded();

    expect(saveButton()).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeDisabled();

    await userEvent.setup().type(input('Display name'), '!');
    expect(saveButton()).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard changes' })).toBeEnabled();
  });

  it('sends only the changed field, shows success, and refreshes the signed-in user', async () => {
    mock.onPatch('/users/me').reply(200, { ...PROFILE, displayName: 'Alice A.' });
    renderView();
    await loaded();
    const user = userEvent.setup();

    await user.clear(input('Display name'));
    await user.type(input('Display name'), 'Alice A.');
    await user.click(saveButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Profile saved.'));
    expect(mock.history.patch).toHaveLength(1);
    expect(lastPatchBody()).toEqual({ displayName: 'Alice A.' });
    expect(screen.getByRole('heading', { level: 1, name: 'Alice A.' })).toBeInTheDocument();
    // The header and the sidebar read the user from the store.
    expect(useStore.getState().user?.displayName).toBe('Alice A.');
    // The saved values are the new baseline.
    expect(saveButton()).toBeDisabled();
    expect(input('Display name').value).toBe('Alice A.');
  });

  it('sends several changed fields together and nothing else', async () => {
    mock.onPatch('/users/me').reply(200, { ...PROFILE, email: 'new@example.com', bio: 'New bio' });
    renderView();
    await loaded();
    const user = userEvent.setup();

    await user.clear(input('Email'));
    await user.type(input('Email'), 'new@example.com');
    await user.clear(input('Bio'));
    await user.type(input('Bio'), 'New bio');
    await user.click(saveButton());

    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(lastPatchBody()).toEqual({ email: 'new@example.com', bio: 'New bio' });
  });

  it('clears a field by sending an empty string, as the API defines', async () => {
    mock.onPatch('/users/me').reply(200, { ...PROFILE, bio: null });
    renderView();
    await loaded();
    const user = userEvent.setup();

    await user.clear(input('Bio'));
    await user.click(saveButton());

    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(lastPatchBody()).toEqual({ bio: '' });
    await waitFor(() => expect(input('Bio').value).toBe(''));
  });

  it('keeps the saved profile after a reload (the server answer is the source of truth)', async () => {
    mock.onPatch('/users/me').reply(200, { ...PROFILE, displayName: 'Persisted' });
    const first = renderView();
    await loaded();
    const user = userEvent.setup();
    await user.clear(input('Display name'));
    await user.type(input('Display name'), 'Persisted');
    await user.click(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    first.unmount();

    mock.onGet('/users/me').reply(200, { ...PROFILE, displayName: 'Persisted' });
    renderView();
    expect(await screen.findByRole('heading', { level: 1, name: 'Persisted' })).toBeInTheDocument();
  });

  it('shows saving feedback and blocks repeated submits while the request runs', async () => {
    mock.onPatch('/users/me').reply(() => new Promise(() => {}));
    renderView();
    await loaded();
    const user = userEvent.setup();

    await user.type(input('Display name'), '!');
    await user.click(saveButton());

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Saving…' })).toHaveAttribute(
        'aria-disabled',
        'true'
      )
    );
    expect(input('Display name')).toHaveAttribute('readonly');
    // A second click while the request runs must not send another one.
    await user.click(screen.getByRole('button', { name: 'Saving…' }));
    expect(mock.history.patch).toHaveLength(1);
  });

  it('discards unsaved edits', async () => {
    renderView();
    await loaded();
    const user = userEvent.setup();

    await user.type(input('Display name'), ' changed');
    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(input('Display name').value).toBe('Alice');
    expect(saveButton()).toBeDisabled();
    expect(mock.history.patch).toHaveLength(0);
  });
});

describe('validation before sending', () => {
  beforeEach(() => {
    mock.onGet('/users/me').reply(200, PROFILE);
  });

  async function submitWith(field: string, value: string) {
    renderView();
    await loaded();
    const user = userEvent.setup();
    await user.clear(input(field));
    // paste: typing 1001 characters one by one would be slow
    if (value) await user.click(input(field)).then(() => user.paste(value));
    await user.click(saveButton());
  }

  it('rejects an invalid email with an actionable message and sends nothing', async () => {
    await submitWith('Email', 'not-an-email');

    expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
    expect(input('Email')).toHaveAttribute('aria-invalid', 'true');
    expect(mock.history.patch).toHaveLength(0);
  });

  it('requires an email', async () => {
    await submitWith('Email', '');

    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(mock.history.patch).toHaveLength(0);
  });

  it('rejects a bio over 1000 characters', async () => {
    await submitWith('Bio', 'x'.repeat(1001));

    expect(await screen.findByText('Bio must be at most 1000 characters')).toBeInTheDocument();
    expect(mock.history.patch).toHaveLength(0);
  });

  it.each(['ftp://example.com/a.png', 'javascript:alert(1)', 'not a link'])(
    'rejects the avatar link %s',
    async (link) => {
      await submitWith('Avatar link', link);

      expect(
        await screen.findByText('Please enter a full link starting with http:// or https://')
      ).toBeInTheDocument();
      expect(mock.history.patch).toHaveLength(0);
    }
  );

  it('links each error to its input for screen readers', async () => {
    await submitWith('Email', 'nope');

    const error = await screen.findByText('Please enter a valid email address');
    expect(input('Email').getAttribute('aria-describedby')).toContain(error.id);
  });

  it('clears the error once the value is fixed', async () => {
    await submitWith('Email', 'nope');
    await screen.findByText('Please enter a valid email address');

    const user = userEvent.setup();
    await user.clear(input('Email'));
    await user.type(input('Email'), 'fixed@example.com');

    await waitFor(() =>
      expect(screen.queryByText('Please enter a valid email address')).not.toBeInTheDocument()
    );
  });
});

describe('save failures', () => {
  beforeEach(() => {
    mock.onGet('/users/me').reply(200, PROFILE);
  });

  async function editBioAndSave() {
    renderView();
    await loaded();
    const user = userEvent.setup();
    await user.type(input('Bio'), ' more');
    await user.click(saveButton());
  }

  it('shows "already in use" under the email field for a 409 and keeps the input', async () => {
    mock.onPatch('/users/me').reply(409, { status: 409, detail: 'Email already registered' });
    renderView();
    await loaded();
    const user = userEvent.setup();
    await user.clear(input('Email'));
    await user.type(input('Email'), 'bob@example.com');
    await user.click(saveButton());

    expect(await screen.findByText('This email address is already in use.')).toBeInTheDocument();
    expect(input('Email').value).toBe('bob@example.com');
    expect(document.body).not.toHaveTextContent('Email already registered');
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('maps server validation errors to our own messages, not the raw text', async () => {
    mock.onPatch('/users/me').reply(400, {
      status: 400,
      detail: 'Validation failed',
      errors: { bio: 'size must be between 0 and 1000' },
    });
    await editBioAndSave();

    expect(await screen.findByText('Bio must be at most 1000 characters')).toBeInTheDocument();
    expect(document.body).not.toHaveTextContent('size must be between');
    expect(input('Bio').value).toBe('Hello there more');
  });

  it('shows a generic form message for a 500, keeps the input, and never toasts server text', async () => {
    mock
      .onPatch('/users/me')
      .reply(500, { status: 500, detail: 'PSQLException: duplicate key at com.devpulse' });
    await editBioAndSave();

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('We could not save your changes. Please try again.');
    expect(document.body).not.toHaveTextContent('PSQLException');
    expect(input('Bio').value).toBe('Hello there more');
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    // The user can try again right away.
    expect(saveButton()).toBeEnabled();
  });

  it('shows the generic form message for a network failure', async () => {
    mock.onPatch('/users/me').networkError();
    await editBioAndSave();

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not save your changes');
    expect(document.body).not.toHaveTextContent('Network Error');
    expect(toast.error).not.toHaveBeenCalled();
  });

  it('succeeds on a second attempt and clears the failure message', async () => {
    mock.onPatch('/users/me').replyOnce(500, { status: 500 });
    await editBioAndSave();
    await screen.findByRole('alert');

    mock.onPatch('/users/me').reply(200, { ...PROFILE, bio: 'Hello there more' });
    await userEvent.setup().click(saveButton());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith('Profile saved.'));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('does not replay an expired-session mutation and preserves the draft', async () => {
    let patchCalls = 0;
    mock.onPatch('/users/me').reply(() => {
      patchCalls += 1;
      return patchCalls === 1
        ? [401, { status: 401, detail: 'Authentication failed' }]
        : [200, { ...PROFILE, bio: 'Hello there more' }];
    });
    await editBioAndSave();

    await waitFor(() => expect(patchCalls).toBe(1));
    expect(toast.success).not.toHaveBeenCalled();
    expect(window.location.href).toBe('/profile');
  });

  it('preserves the failed edit without showing authentication internals', async () => {
    mock.onPatch('/users/me').reply(401, { status: 401, detail: 'Authentication failed' });
    await editBioAndSave();

    await waitFor(() =>
      expect(mock.history.get.some((request) => request.url === '/users/me')).toBe(true)
    );
    expect(window.location.href).toBe('/profile');
    expect(document.body).not.toHaveTextContent('Authentication failed');
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe('data staying in step with the server', () => {
  beforeEach(() => {
    mock.onGet('/users/me').reply(200, PROFILE);
  });

  it('shows newer server data in an untouched form, so Save cannot write stale values back', async () => {
    const { client } = renderView();
    await loaded();

    act(() => {
      client.setQueryData(['/users/me', 1], { ...PROFILE, displayName: 'Changed elsewhere' });
    });

    await waitFor(() => expect(input('Display name').value).toBe('Changed elsewhere'));
    expect(saveButton()).toBeDisabled();
  });

  it('keeps what the user typed in one field while another field is updated from the server', async () => {
    const { client } = renderView();
    await loaded();
    const user = userEvent.setup();
    await user.type(input('Bio'), ' typed by me');
    const typed = input('Bio').value;

    act(() => {
      client.setQueryData(['/users/me', 1], { ...PROFILE, displayName: 'Changed elsewhere' });
    });

    // The untouched field follows the server, the field being edited keeps the user's text.
    await waitFor(() => expect(input('Display name').value).toBe('Changed elsewhere'));
    expect(input('Bio').value).toBe(typed);
    expect(saveButton()).toBeEnabled();
  });

  it('sends only the field the user edited when another one changed on the server meanwhile', async () => {
    mock
      .onPatch('/users/me')
      .reply(200, { ...PROFILE, displayName: 'Changed elsewhere', bio: 'Mine' });
    const { client } = renderView();
    await loaded();
    const user = userEvent.setup();
    await user.clear(input('Bio'));
    await user.type(input('Bio'), 'Mine');
    act(() => {
      client.setQueryData(['/users/me', 1], { ...PROFILE, displayName: 'Changed elsewhere' });
    });
    await waitFor(() => expect(input('Display name').value).toBe('Changed elsewhere'));

    await user.click(saveButton());

    await waitFor(() => expect(mock.history.patch).toHaveLength(1));
    expect(lastPatchBody()).toEqual({ bio: 'Mine' });
  });

  it('keeps keyboard focus on the field after the user saves', async () => {
    mock.onPatch('/users/me').reply(200, { ...PROFILE, displayName: 'Alice A.' });
    renderView();
    await loaded();
    const user = userEvent.setup();
    await user.clear(input('Display name'));
    await user.type(input('Display name'), 'Alice A.{Enter}');

    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    expect(input('Display name')).toHaveFocus();
  });

  it('ignores Discard while a save is running', async () => {
    mock.onPatch('/users/me').reply(() => new Promise(() => {}));
    renderView();
    await loaded();
    const user = userEvent.setup();
    await user.type(input('Display name'), ' edited');
    await user.click(saveButton());
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeInTheDocument()
    );

    await user.click(screen.getByRole('button', { name: 'Discard changes' }));

    expect(input('Display name').value).toBe('Alice edited');
  });

  it('keeps unsaved edits when a refresh changes nothing the form shows', async () => {
    const { client } = renderView();
    await loaded();
    const user = userEvent.setup();
    await user.type(input('Display name'), ' typed');

    act(() => {
      client.setQueryData(['/users/me', 1], { ...PROFILE, postCount: 99 });
    });

    expect(input('Display name').value).toBe('Alice typed');
    expect(await screen.findByText('99 Posts')).toBeInTheDocument();
  });

  it('keeps the saved result even if an older refresh finishes after the save', async () => {
    // One GET handler whose answer the test controls (the first registered handler always wins).
    let slowMode = false;
    let staleRequested = false;
    let releaseStale: () => void = () => {};
    mock.resetHandlers();
    mock.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
    mock.onGet('/users/me').reply(() => {
      if (!slowMode) return [200, PROFILE];
      staleRequested = true;
      return new Promise((resolve) => {
        releaseStale = () => resolve([200, { ...PROFILE, displayName: 'Stale' }]);
      });
    });
    const { client } = renderView();
    await loaded();

    // A background refresh starts and is still running when the user saves.
    slowMode = true;
    act(() => {
      void client.refetchQueries({ queryKey: ['/users/me'] });
    });
    await waitFor(() => expect(staleRequested).toBe(true));

    mock.onPatch('/users/me').reply(200, { ...PROFILE, displayName: 'Saved' });
    const user = userEvent.setup();
    await user.clear(input('Display name'));
    await user.type(input('Display name'), 'Saved');
    await user.click(saveButton());
    await waitFor(() => expect(toast.success).toHaveBeenCalled());

    await act(async () => {
      releaseStale();
      // React Query notifies its observers asynchronously; give a late overwrite time to show up.
      await new Promise((resolve) => setTimeout(resolve, 50));
    });
    await waitFor(() => expect(client.isFetching()).toBe(0));

    expect(screen.getByRole('heading', { level: 1, name: 'Saved' })).toBeInTheDocument();
    expect(input('Display name').value).toBe('Saved');
  });

  it("never shows another account's cached profile after the user changed", async () => {
    const first = renderView();
    await loaded();
    expect(screen.getByRole('heading', { level: 1, name: 'Alice' })).toBeInTheDocument();
    first.unmount();

    // A different account, same browser tab, same query cache.
    const bob = {
      ...PROFILE,
      id: 2,
      username: 'bob',
      email: 'bob@example.com',
      displayName: 'Bob',
    };
    useStore.setState({ user: bob, isAuthenticated: true });
    mock.onGet('/users/me').reply(200, bob);
    renderView(first.client);

    expect(screen.queryByText('alice@example.com')).not.toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 1, name: 'Bob' })).toBeInTheDocument();
    expect(input('Email').value).toBe('bob@example.com');
  });
});

describe('keyboard and screen reader flow', () => {
  beforeEach(() => {
    mock.onGet('/users/me').reply(200, PROFILE);
  });

  it('keeps focus in the field while saving instead of dropping it', async () => {
    mock.onPatch('/users/me').reply(() => new Promise(() => {}));
    renderView();
    await loaded();
    const user = userEvent.setup();

    await user.type(input('Display name'), '!{Enter}');

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Saving…' })).toBeInTheDocument()
    );
    expect(input('Display name')).toHaveFocus();
    expect(input('Display name')).toHaveAttribute('readonly');
    expect(input('Display name')).not.toBeDisabled();
  });

  it('moves focus to the field the server rejected', async () => {
    mock.onPatch('/users/me').reply(409, { status: 409, detail: 'Email already registered' });
    renderView();
    await loaded();
    const user = userEvent.setup();
    await user.clear(input('Email'));
    await user.type(input('Email'), 'bob@example.com');
    await user.click(saveButton());

    await screen.findByText('This email address is already in use.');
    expect(input('Email')).toHaveFocus();
  });

  it('moves focus to the failure message when no field is to blame', async () => {
    mock.onPatch('/users/me').reply(500, { status: 500 });
    renderView();
    await loaded();
    const user = userEvent.setup();
    await user.type(input('Bio'), ' more');
    await user.click(saveButton());

    expect(await screen.findByRole('alert')).toHaveFocus();
  });

  it('counts the characters that will actually be saved (trimmed), like the validation does', async () => {
    renderView();
    await loaded();
    const user = userEvent.setup();
    await user.clear(input('Bio'));
    await user.click(input('Bio'));
    await user.paste('abc   \n\n');

    expect(screen.getByText('3/1000')).toBeInTheDocument();
  });
});

describe('leaving with unsaved changes', () => {
  function tryToUnload() {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  }

  it('lets the browser warn about a reload only while there are unsaved changes', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    renderView();
    await loaded();
    expect(tryToUnload()).toBe(false);

    await userEvent.setup().type(input('Bio'), ' more');
    expect(tryToUnload()).toBe(true);

    await userEvent.setup().click(screen.getByRole('button', { name: 'Discard changes' }));
    expect(tryToUnload()).toBe(false);
  });

  it('stops warning once the changes are saved', async () => {
    mock.onGet('/users/me').reply(200, PROFILE);
    mock.onPatch('/users/me').reply(200, { ...PROFILE, bio: 'Hello there more' });
    renderView();
    await loaded();

    const user = userEvent.setup();
    await user.type(input('Bio'), ' more');
    expect(tryToUnload()).toBe(true);
    await user.click(saveButton());

    await waitFor(() => expect(tryToUnload()).toBe(false));
  });
});
