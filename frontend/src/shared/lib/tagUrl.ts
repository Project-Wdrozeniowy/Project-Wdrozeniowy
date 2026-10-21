/** The forum feed filtered by one tag: `/forum?tag=<slug>`. The slug is encoded. */
export function tagHref(slug: string): string {
  return `/forum?${new URLSearchParams({ tag: slug }).toString()}`;
}
