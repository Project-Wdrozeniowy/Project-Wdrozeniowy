import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import RoleGuard from '../RoleGuard';

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

describe('RoleGuard – no user (unauthenticated)', () => {
  beforeEach(() => {
    vi.mocked(useStore).mockReturnValue(null);
  });

  it('renders nothing', () => {
    const { container } = render(
      <RoleGuard allowedRoles={['ADMIN']}>
        <div>admin content</div>
      </RoleGuard>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('does not redirect when user is null', () => {
    render(
      <RoleGuard allowedRoles={['ADMIN']}>
        <div>admin content</div>
      </RoleGuard>,
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('RoleGuard – user with correct role', () => {
  beforeEach(() => {
    vi.mocked(useStore).mockReturnValue({ id: '1', role: 'ADMIN' });
  });

  it('renders children', () => {
    render(
      <RoleGuard allowedRoles={['ADMIN']}>
        <div>admin content</div>
      </RoleGuard>,
    );
    expect(screen.getByText('admin content')).toBeInTheDocument();
  });

  it('does not redirect', () => {
    render(
      <RoleGuard allowedRoles={['ADMIN']}>
        <div>admin content</div>
      </RoleGuard>,
    );
    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe('RoleGuard – user with wrong role', () => {
  beforeEach(() => {
    vi.mocked(useStore).mockReturnValue({ id: '1', role: 'USER' });
  });

  it('renders nothing', () => {
    const { container } = render(
      <RoleGuard allowedRoles={['ADMIN']}>
        <div>admin content</div>
      </RoleGuard>,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('redirects to /', () => {
    render(
      <RoleGuard allowedRoles={['ADMIN']}>
        <div>admin content</div>
      </RoleGuard>,
    );
    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('does not render children', () => {
    render(
      <RoleGuard allowedRoles={['ADMIN']}>
        <div>admin content</div>
      </RoleGuard>,
    );
    expect(screen.queryByText('admin content')).not.toBeInTheDocument();
  });
});

describe('RoleGuard – multiple allowed roles', () => {
  it('grants access to USER when USER is allowed', () => {
    vi.mocked(useStore).mockReturnValue({ id: '1', role: 'USER' });
    render(
      <RoleGuard allowedRoles={['USER', 'ADMIN']}>
        <div>shared content</div>
      </RoleGuard>,
    );
    expect(screen.getByText('shared content')).toBeInTheDocument();
  });
});
