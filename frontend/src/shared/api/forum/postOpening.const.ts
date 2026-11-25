/** How often a failed delivery of one opening is tried again (with the same opening id). */
export const OPENING_RETRIES = 2;
/** Waits before the first and the second retry; the opening is let go after the last one. */
export const OPENING_RETRY_DELAYS_MS = [1000, 3000] as const;
/** What the recording asks of the transport: it is silent, whatever happens. */
export const OPENING_REQUEST = { skipErrorToast: true, skipUnauthorizedHandler: true } as const;
