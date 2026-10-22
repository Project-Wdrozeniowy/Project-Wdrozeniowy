import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/(auth)/login/page';
import RegisterPage from '@/app/(auth)/register/page';
import { CATEGORIES } from '@/shared/constants/categories.const';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  register: vi.fn(),
  loadProfile: vi.fn(),
  setAuth: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock('@/shared/api/auth/authClient', () => ({ authService: mocks }));
vi.mock('@/store', () => ({
  useStore: (select: (state: { setAuth: typeof mocks.setAuth }) => unknown) =>
    select({ setAuth: mocks.setAuth }),
}));
vi.mock('@/shared/lib/toast', () => ({ toast: { success: mocks.success } }));

// These render the route pages with the real forms and hooks and fake the service, router,
// store and toast: they check the submit flow, not live API integration.
const profile = { id: 1, username: 'alice', displayName: 'Alice' };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.login.mockResolvedValue({ accessToken: 'access' });
  mocks.register.mockResolvedValue({ accessToken: 'access' });
  mocks.loadProfile.mockResolvedValue(profile);
});

async function fillLogin() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), 'alice');
  await user.type(screen.getByLabelText('Password'), 'Password123');
  return user;
}

it('does not send an invalid login form', async () => {
  render(<LoginPage />);
  await userEvent.setup().click(screen.getByRole('button', { name: 'Sign In' }));
  expect(await screen.findByText('Username is required')).toBeInTheDocument();
  expect(mocks.login).not.toHaveBeenCalled();
});

it('loads the authenticated profile before setting auth and navigating', async () => {
  render(<LoginPage />);
  const user = await fillLogin();
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
  expect(mocks.login).toHaveBeenCalledWith({ username: 'alice', password: 'Password123' });
  expect(mocks.loadProfile).toHaveBeenCalledWith('access');
  expect(mocks.setAuth).toHaveBeenCalledWith(profile, 'access');
});

it('shows the credential error for 401 without establishing a session', async () => {
  mocks.login.mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
  render(<LoginPage />);
  const user = await fillLogin();
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
  expect(await screen.findByText('Invalid username or password')).toBeInTheDocument();
  expect(mocks.loadProfile).not.toHaveBeenCalled();
  expect(mocks.setAuth).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
});

it('keeps submission disabled while authentication is pending', async () => {
  let resolveLogin!: (value: { accessToken: string }) => void;
  mocks.login.mockImplementationOnce(() => new Promise((resolve) => (resolveLogin = resolve)));
  render(<LoginPage />);
  const user = await fillLogin();
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
  const pendingButton = await screen.findByRole('button', { name: 'Signing in…' });
  expect(pendingButton).toBeDisabled();
  await user.click(pendingButton);
  expect(mocks.login).toHaveBeenCalledTimes(1);
  resolveLogin({ accessToken: 'access' });
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
});

it('does not announce login success if profile loading fails', async () => {
  mocks.loadProfile.mockRejectedValue(new Error('profile failed'));
  render(<LoginPage />);
  const user = await fillLogin();
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
  expect(await screen.findByText('Sign in failed. Please try again.')).toBeInTheDocument();
  expect(mocks.setAuth).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
  expect(mocks.success).not.toHaveBeenCalled();
});

async function fillRegistration() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Username'), 'alice');
  await user.type(screen.getByLabelText('Display Name'), 'Alice');
  await user.type(screen.getByLabelText('Email'), 'alice@example.com');
  await user.type(screen.getByLabelText('Password'), 'Password123');
  await user.type(screen.getByLabelText('Confirm Password'), 'Password123');
  await user.click(screen.getByRole('checkbox'));
  return user;
}

it('submits the supported registration fields and establishes auth after profile success', async () => {
  render(<RegisterPage />);
  const user = await fillRegistration();
  await user.click(screen.getByRole('button', { name: 'Create Account' }));
  await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/'));
  // Exactly the API's fields: no repeated password or terms, and no interests (PWDRZ-154).
  expect(mocks.register).toHaveBeenCalledWith({
    username: 'alice',
    email: 'alice@example.com',
    password: 'Password123',
    displayName: 'Alice',
  });
  expect(mocks.setAuth).toHaveBeenCalledWith(profile, 'access');
});

it('shows registration failure and retains safe form fields without announcing success', async () => {
  mocks.register.mockRejectedValue(new Error('network'));
  render(<RegisterPage />);
  const user = await fillRegistration();
  await user.click(screen.getByRole('button', { name: 'Create Account' }));
  expect(await screen.findByText('Registration failed. Please try again.')).toBeInTheDocument();
  expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com');
  expect(mocks.setAuth).not.toHaveBeenCalled();
  expect(mocks.push).not.toHaveBeenCalled();
});

describe('registration display name', () => {
  async function submitWithDisplayName(displayName: string) {
    render(<RegisterPage />);
    const user = userEvent.setup();
    await user.type(screen.getByLabelText('Username'), 'alice');
    if (displayName) await user.type(screen.getByLabelText('Display Name'), displayName);
    await user.type(screen.getByLabelText('Email'), 'alice@example.com');
    await user.type(screen.getByLabelText('Password'), 'Password123');
    await user.type(screen.getByLabelText('Confirm Password'), 'Password123');
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    return user;
  }

  it('trims the display name before sending it', async () => {
    await submitWithDisplayName('  Alice A.  ');
    await waitFor(() => expect(mocks.register).toHaveBeenCalled());
    expect(mocks.register.mock.calls[0][0].displayName).toBe('Alice A.');
  });

  it('leaves the display name out when it is empty: it is optional', async () => {
    await submitWithDisplayName('');
    await waitFor(() => expect(mocks.register).toHaveBeenCalled());
    expect(mocks.register.mock.calls[0][0]).not.toHaveProperty('displayName');
  });

  it('leaves the display name out when it is only spaces, which the API would reject', async () => {
    await submitWithDisplayName('   ');
    await waitFor(() => expect(mocks.register).toHaveBeenCalled());
    expect(mocks.register.mock.calls[0][0]).not.toHaveProperty('displayName');
  });

  it('does not send a display name over 100 characters', async () => {
    await submitWithDisplayName('a'.repeat(101));
    expect(
      await screen.findByText('Display name must be at most 100 characters')
    ).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it('marks the fields the server rejects and keeps what was typed', async () => {
    mocks.register.mockRejectedValue({
      isAxiosError: true,
      response: {
        status: 400,
        data: {
          status: 400,
          errors: {
            displayName: 'must not be blank',
            email: 'must be a well-formed email address',
          },
        },
      },
    });
    await submitWithDisplayName('Alice');

    expect(
      await screen.findByText('Display name must be at most 100 characters and not blank')
    ).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
    expect(screen.queryByText(/well-formed/)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Username')).toHaveValue('alice');
    expect(screen.getByLabelText('Display Name')).toHaveValue('Alice');
    expect(screen.getByLabelText('Email')).toHaveValue('alice@example.com');
    expect(mocks.setAuth).not.toHaveBeenCalled();
  });

  it('says the username is taken under the username field, not with server text', async () => {
    mocks.register.mockRejectedValue({
      isAxiosError: true,
      response: { status: 409, data: { status: 409, detail: 'Username already taken' } },
    });
    await submitWithDisplayName('Alice');

    expect(await screen.findByText('This username is already taken')).toBeInTheDocument();
    expect(screen.queryByText('Username already taken')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Display Name')).toHaveValue('Alice');
  });
});

describe('registration interests (provisional, PWDRZ-154)', () => {
  it('shows the interests as unavailable instead of a working choice', () => {
    render(<RegisterPage />);

    expect(screen.getByText('Coming soon')).toBeInTheDocument();
    expect(screen.getByText(/Choosing topics is not available yet/)).toBeInTheDocument();
    // No topic can be pressed: none of the categories is a button.
    for (const { label } of CATEGORIES) {
      expect(screen.queryByRole('button', { name: label })).toBeNull();
    }
  });

  it('registers without interests: the request has only the fields the API defines', async () => {
    render(<RegisterPage />);
    const user = await fillRegistration();
    await user.click(screen.getByRole('button', { name: 'Create Account' }));
    await waitFor(() => expect(mocks.register).toHaveBeenCalled());

    expect(mocks.register.mock.calls[0][0]).not.toHaveProperty('interests');
    expect(Object.keys(mocks.register.mock.calls[0][0]).sort()).toEqual([
      'displayName',
      'email',
      'password',
      'username',
    ]);
  });
});
