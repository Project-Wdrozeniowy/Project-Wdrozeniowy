import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LoginPage from '@/app/(auth)/login/page';
import RegisterPage from '@/app/(auth)/register/page';

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
vi.mock('@/store', () => ({ useStore: () => ({ setAuth: mocks.setAuth }) }));
vi.mock('@/shared/lib/toast', () => ({ toast: { success: mocks.success } }));

// PWDRZ-131 owns the later extraction. These check current orchestration, not
// live API integration. PWDRZ-128 owns displayName mapping; PWDRZ-154 owns the
// unsupported interests UI. Neither omission is asserted as the final contract.
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
  expect(mocks.register).toHaveBeenCalledWith(
    expect.objectContaining({
      username: 'alice',
      email: 'alice@example.com',
      password: 'Password123',
    })
  );
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
