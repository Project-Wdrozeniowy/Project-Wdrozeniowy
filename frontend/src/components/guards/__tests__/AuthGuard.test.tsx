import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import AuthGuard from '../AuthGuard';
import { useStore } from '@/store';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/store', () => ({
  useStore: vi.fn(),
}));

function mockAuth(isInitialized: boolean, isAuthenticated: boolean) {
  vi.mocked(useStore).mockImplementation(((selector: (s: unknown) => unknown) =>
    selector({ isInitialized, isAuthenticated })) as typeof useStore);
}

function renderGuard() {
  return render(
    <AuthGuard>
      <div>protected content</div>
    </AuthGuard>
  );
}

beforeEach(() => {
  mockReplace.mockClear();
});

describe('AuthGuard – session still being restored (page reload)', () => {
  beforeEach(() => mockAuth(false, false));

  it('shows a loader without the protected content', () => {
    renderGuard();
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('does not redirect yet', () => {
    renderGuard();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('AuthGuard – guest', () => {
  beforeEach(() => mockAuth(true, false));

  it('renders nothing and does not expose children', () => {
    const { container } = renderGuard();
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });

  it('redirects to /login', () => {
    renderGuard();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});

describe('AuthGuard – signed in', () => {
  beforeEach(() => mockAuth(true, true));

  it('renders children without redirecting', () => {
    renderGuard();
    expect(screen.getByText('protected content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
