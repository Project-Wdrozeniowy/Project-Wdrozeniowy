import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import AuthGuard from '../AuthGuard';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/store', () => ({
  useStore: vi.fn(),
}));

import { useStore } from '@/store';

beforeEach(() => {
  mockReplace.mockClear();
});

describe('AuthGuard – unauthenticated', () => {
  beforeEach(() => {
    vi.mocked(useStore).mockReturnValue(false);
  });

  it('renders nothing', () => {
    const { container } = render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('redirects to /login', () => {
    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });

  it('does not render children', () => {
    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );
    expect(screen.queryByText('protected content')).not.toBeInTheDocument();
  });
});

describe('AuthGuard – authenticated', () => {
  beforeEach(() => {
    vi.mocked(useStore).mockReturnValue(true);
  });

  it('renders children', () => {
    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );
    expect(screen.getByText('protected content')).toBeInTheDocument();
  });

  it('does not redirect', () => {
    render(
      <AuthGuard>
        <div>protected content</div>
      </AuthGuard>,
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});
