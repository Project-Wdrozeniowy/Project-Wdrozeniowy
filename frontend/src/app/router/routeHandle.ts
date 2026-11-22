/**
 * What a route says about its frame. `wide` pages use the whole width and have no sidebar (the
 * settings page, as in the design); every other page of the main layout keeps the sidebar.
 */
export interface RouteHandle {
  wide?: boolean;
}

export function isWideRoute(handle: unknown): boolean {
  return (handle as RouteHandle | undefined)?.wide === true;
}
