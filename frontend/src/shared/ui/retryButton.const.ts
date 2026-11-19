export const RETRY_LABEL = 'Try again';
export const RETRYING_LABEL = 'Trying again…';
/** Announced when a retry ends and the failure is still on screen. */
export const RETRY_FAILED_MESSAGE = 'Still could not load. You can try again.';

/** The looks of a retry action; the behaviour is the same for all of them. */
export const RETRY_BUTTON_VARIANTS = {
  /** In a card of its own. */
  solid:
    'bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded transition-colors aria-disabled:opacity-60 aria-disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500',
  /** Inside another card, next to its message. */
  outline:
    'rounded border border-line-strong px-3 py-1 text-sm font-semibold text-fg hover:bg-raised aria-disabled:opacity-60 aria-disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-500',
  /** Inside a line of text, such as a field's message. */
  inline:
    'font-semibold underline aria-disabled:opacity-60 aria-disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-500',
} as const;

export type RetryButtonVariant = keyof typeof RETRY_BUTTON_VARIANTS;
