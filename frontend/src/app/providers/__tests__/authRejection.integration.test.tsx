import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import MockAdapter from 'axios-mock-adapter';
import type { AxiosInstance } from 'axios';
import AuthProvider from '@/app/providers/AuthProvider';
import LoginForm from '@/features/sign-in/LoginForm';
import RegisterForm from '@/features/sign-up/RegisterForm';
import { apiClient } from '@/shared/api/client/api';
import { useStore } from '@/store';

let http: MockAdapter;
const profile = { id: 1, username: 'alice' };
const banner = /unable to verify your session/i;
const retry = { name: 'Retry session check' };

beforeEach(() => {
  vi.stubGlobal('BroadcastChannel', undefined);
  http = new MockAdapter((apiClient as unknown as { client: AxiosInstance }).client);
  http.onGet('/auth/csrf').reply(200, { token: 'csrf', headerName: 'X-CSRF-TOKEN' });
  http.onGet('/users/me').replyOnce(401);
});

afterEach(() => {
  cleanup();
  http.restore();
  vi.unstubAllGlobals();
});

async function form(register = false) {
  render(<AuthProvider>{register ? <RegisterForm /> : <LoginForm />}</AuthProvider>);
  await screen.findByLabelText('Username');
  expect(useStore.getState().sessionStatus).toBe('guest');
  const fields = { Username: 'alice', Password: 'Password123' };
  for (const [label, value] of Object.entries(fields)) {
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  }
  if (register) {
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'new@example.test' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: fields.Password },
    });
    fireEvent.click(screen.getByRole('checkbox'));
  }
  fireEvent.click(screen.getByRole('button', { name: register ? 'Create Account' : 'Sign In' }));
}

it.each([
  ['login', 401, 'Invalid username or password'],
  ['register', 409, 'This username is already taken'],
] as const)('keeps a rejected %s local to the guest form', async (operation, status, message) => {
  const detail = operation === 'register' ? 'Username already taken' : 'Authentication failed';
  http.onPost('/auth/' + operation).reply(status, { detail });
  await form(operation === 'register');
  expect(await screen.findByText(message)).toBeVisible();
  expect(useStore.getState()).toMatchObject({ sessionStatus: 'guest', user: null });
  expect(screen.queryByText(banner)).toBeNull();
  expect(screen.queryByRole('button', retry)).toBeNull();
  expect(screen.getByLabelText('Username')).toHaveValue('alice');
  expect(screen.getByLabelText('Password')).toHaveValue('Password123');
  expect(http.history.post).toHaveLength(1);
});

it.each([
  ['before submission', 0],
  ['after acceptance', 1],
] as const)('keeps a CSRF failure %s distinct from a credential rejection', async (_, posts) => {
  http.resetHandlers();
  http.onGet('/users/me').replyOnce(401);
  if (posts === 1) {
    http.onGet('/auth/csrf').replyOnce(200, { token: 'first', headerName: 'X-CSRF-TOKEN' });
  }
  http.onGet('/auth/csrf').reply(401);
  http.onPost('/auth/login').reply(204);
  await form();
  expect(await screen.findByText(banner)).toBeVisible();
  expect(screen.queryByText('Invalid username or password')).toBeNull();
  expect(useStore.getState()).toMatchObject({ sessionStatus: 'error', user: null });
  expect(http.history.post).toHaveLength(posts);
});

it('treats a gateway failure during submission as an unknown session', async () => {
  http.onPost('/auth/login').reply(502);
  await form();
  expect(await screen.findByRole('button', retry)).toBeVisible();
  expect(useStore.getState()).toMatchObject({ sessionStatus: 'error', user: null });
  expect(http.history.post).toHaveLength(1);
});

it.each([401, 503])('keeps profile %s after accepted credentials recoverable', async (status) => {
  http.onPost('/auth/login').reply(204);
  http.onGet('/users/me').replyOnce(status).onGet('/users/me').reply(200, profile);
  await form();
  expect(await screen.findByText(banner)).toBeVisible();
  expect(screen.queryByText('Invalid username or password')).toBeNull();
  expect(useStore.getState()).toMatchObject({ sessionStatus: 'error', user: null });
  fireEvent.click(screen.getByRole('button', retry));
  await waitFor(() => expect(useStore.getState().user).toEqual(profile));
  expect(screen.queryByText(banner)).toBeNull();
  expect(http.history.post).toHaveLength(1);
});

it.each([
  [200, 'authenticated'],
  [401, 'guest'],
  [503, 'error'],
] as const)('recovers an ambiguous POST by reading the session (%i)', async (status, expected) => {
  http.onPost('/auth/login').networkError();
  http.onGet('/users/me').reply(status, profile);
  await form();
  expect(await screen.findByText(banner)).toBeVisible();
  expect(useStore.getState()).toMatchObject({ sessionStatus: 'error', user: null });
  fireEvent.click(screen.getByRole('button', retry));
  await waitFor(() =>
    expect(http.history.get.filter((r) => r.url === '/users/me')).toHaveLength(2)
  );
  await waitFor(() => expect(useStore.getState().sessionStatus).toBe(expected));
  expect(Boolean(screen.queryByText(banner))).toBe(expected === 'error');
  expect(http.history.post).toHaveLength(1);
});
