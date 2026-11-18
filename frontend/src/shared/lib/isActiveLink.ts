/** `/forum/some-post` keeps "Forum" highlighted; `/` only matches the home page exactly. */
export function isActiveLink(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname === href || pathname.startsWith(`${href}/`);
}
