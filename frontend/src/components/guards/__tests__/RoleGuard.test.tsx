import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import RoleGuard from '../RoleGuard';
import { useStore } from '@/store';
import type { UserRole } from '@/shared/types';

const mockReplace = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
}));

vi.mock('@/store', () => ({
  useStore: vi.fn(),
}));

function mockState(isAuthenticated: boolean, role: UserRole | null) {
  const user = role ? { id: 1, role } : null;
  vi.mocked(useStore).mockImplementation(((selector: (s: unknown) => unknown) =>
    selector({ isAuthenticated, user })) as typeof useStore);
}

function renderGuard(allowedRoles: UserRole[] = ['ADMIN']) {
  return render(
    <RoleGuard allowedRoles={allowedRoles}>
      <div>admin content</div>
    </RoleGuard>
  );
}

beforeEach(() => {
  mockReplace.mockClear();
});

describe('RoleGuard – unauthenticated', () => {
  beforeEach(() => mockState(false, null));

  it('renders nothing and redirects to /login', () => {
    const { container } = renderGuard();
    expect(container).toBeEmptyDOMElement();
    expect(mockReplace).toHaveBeenCalledWith('/login');
  });
});

describe('RoleGuard – authenticated, profile still loading', () => {
  beforeEach(() => mockState(true, null));

  it('renders nothing and does not redirect', () => {
    const { container } = renderGuard();
    expect(container).toBeEmptyDOMElement();
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('RoleGuard – allowed role', () => {
  beforeEach(() => mockState(true, 'ADMIN'));

  it('renders children without redirecting', () => {
    renderGuard();
    expect(screen.getByText('admin content')).toBeInTheDocument();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('accepts any role from a multi-role list', () => {
    renderGuard(['MODERATOR', 'ADMIN']);
    expect(screen.getByText('admin content')).toBeInTheDocument();
  });
});

describe('RoleGuard – forbidden role', () => {
  it.each<UserRole>(['USER', 'MODERATOR'])('redirects %s to / and hides children', (role) => {
    mockState(true, role);
    const { container } = renderGuard(['ADMIN']);
    expect(container).toBeEmptyDOMElement();
    expect(mockReplace).toHaveBeenCalledWith('/');
  });
});
