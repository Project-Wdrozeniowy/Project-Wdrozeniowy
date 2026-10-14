import { render, screen } from '@testing-library/react';
import NavLinks, { isActiveLink } from '../NavLinks';

describe('isActiveLink', () => {
  it('matches home only exactly', () => {
    expect(isActiveLink('/', '/')).toBe(true);
    expect(isActiveLink('/forum', '/')).toBe(false);
  });

  it('matches nested routes under a section', () => {
    expect(isActiveLink('/forum', '/forum')).toBe(true);
    expect(isActiveLink('/forum/my-post', '/forum')).toBe(true);
  });

  it('does not match a path that merely shares a prefix', () => {
    expect(isActiveLink('/forums', '/forum')).toBe(false);
  });
});

describe('NavLinks', () => {
  const links = [
    { href: '/', label: 'Home' },
    { href: '/forum', label: 'Forum' },
  ];

  it('marks the current section with aria-current', () => {
    render(<NavLinks links={links} pathname="/forum/my-post" />);
    expect(screen.getByRole('link', { name: 'Forum' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Home' })).not.toHaveAttribute('aria-current');
  });
});
