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

function mockAuth(isAuthenticated: boolean) {
  vi.mocked(useStore).mockImplementation(((selector: (s: unknown) => unknown) =>
    selector({ isAuthenticated })) as typeof useStore);
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

describe('AuthGuard – unauthenticated', () => {
  beforeEach(() => mockAuth(false));

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

describe('AuthGuard – authenticated', () => {
  beforeEach(() => mockAuth(true));

  it('renders children', () => {
    renderGuard();
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('does not redirect', () => {
    renderGuard();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
