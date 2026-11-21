import { render } from '@testing-library/react';
import { PAGE_ICONS, pageIcon } from '@/shared/ui/pageIcons';

describe('PAGE_ICONS', () => {
  it('has an icon for every page the shell links to, each hidden from assistive technology', () => {
    for (const address of Object.keys(PAGE_ICONS) as Array<keyof typeof PAGE_ICONS>) {
      const Icon = PAGE_ICONS[address];
      const { container, unmount } = render(<Icon />);
      expect(container.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      unmount();
    }
    expect(Object.keys(PAGE_ICONS).sort()).toEqual(
      ['/', '/dashboard', '/forum', '/notifications', '/profile', '/settings'].sort()
    );
  });
});

describe('pageIcon', () => {
  it('finds the icon of a known address and nothing for another page', () => {
    expect(pageIcon('/forum')).toBe(PAGE_ICONS['/forum']);
    expect(pageIcon('/somewhere-else')).toBeUndefined();
    expect(pageIcon('constructor')).toBeUndefined();
  });
});
