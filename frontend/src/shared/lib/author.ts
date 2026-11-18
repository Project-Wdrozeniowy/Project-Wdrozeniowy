/** The name shown for an author: the display name when there is one, else the username. */
export function authorName(author: { displayName: string | null; username: string }): string {
  return author.displayName?.trim() || author.username;
}

/** The first letter of a name; Array.from keeps an emoji whole, unlike charAt(0). */
export function initialOf(name: string): string {
  return (Array.from(name)[0] ?? '').toUpperCase();
}
