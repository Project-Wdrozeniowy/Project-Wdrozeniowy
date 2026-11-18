export const NAV_LINKS = [
  { href: '/', label: 'Home' },
  { href: '/forum', label: 'Forum' },
  { href: '/dashboard', label: 'Analytics' },
] as const;

/** The bottom bar of small screens shows the same page links, plus the profile when signed in. */
export const MOBILE_PROFILE_LINK = { href: '/profile', label: 'Profile' } as const;
export const MOBILE_TABS_LABEL = 'Main navigation';
export const ACCOUNT_MENU_LABEL = 'Account menu';
