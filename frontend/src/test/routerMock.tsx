import type * as Router from 'react-router';
import type { LinkProps } from 'react-router';
import { vi } from 'vitest';

/** Component tests mock navigation; real routing is exercised separately and in Playwright. */
export async function routerMock(overrides: Record<string, unknown> = {}) {
  const actual = await vi.importActual<typeof Router>('react-router');
  return {
    ...actual,
    Link: ({ to, ...props }: LinkProps) => (
      <a {...props} href={typeof to === 'string' ? to : actual.createPath(to)} />
    ),
    useNavigate: () => vi.fn(),
    useLocation: () => ({ pathname: '/', search: '', hash: '', state: null, key: 'test' }),
    useSearchParams: () => [new URLSearchParams(), vi.fn()],
    ...overrides,
  };
}
