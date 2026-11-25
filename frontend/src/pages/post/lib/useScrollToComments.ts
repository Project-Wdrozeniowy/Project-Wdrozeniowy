import { useEffect } from 'react';

/** The reader's own input; from the first of these on, the page is theirs and is never moved. */
const READER_INPUT = ['wheel', 'touchstart', 'pointerdown', 'keydown'] as const;
/** The content above the comments settles within moments; after this the anchor is let go. */
export const HOLD_ANCHOR_MS = 5000;

/**
 * Brings the target of a `#comments` link into view once the post is on screen, and keeps it there
 * while the content above it still changes height (the insights card loads its figures and its
 * chart after the post does). Without this the comments are scrolled to once, then pushed down the
 * page by what loads above them. It lets go at the reader's first scroll, tap, click or key, and
 * after `HOLD_ANCHOR_MS`, so it never fights the reader.
 *
 * `shownPost` is what the page shows (the post's id), `null` when there is nothing to scroll to
 * (no fragment, or the post is not loaded): another post runs it again.
 */
export function useScrollToComments(targetId: string, shownPost: number | null) {
  useEffect(() => {
    const target = shownPost === null ? null : document.getElementById(targetId);
    if (!target) return;

    // Where the page and the comments stood right after our own scroll.
    let scrollY = 0;
    let top = 0;
    const show = () => {
      target.scrollIntoView();
      scrollY = window.scrollY;
      top = target.getBoundingClientRect().top;
    };
    show();

    const release = () => {
      observer?.disconnect();
      window.clearTimeout(timer);
      READER_INPUT.forEach((type) => window.removeEventListener(type, release));
    };

    // Anything in the column can change its height; only a move of the comments themselves matters,
    // so their own growth (the list loading, a comment posted) never pulls the reader back. A page
    // that is not where we left it was moved by the reader (a scrollbar drag, find in page).
    const onColumnResize = () => {
      if (window.scrollY !== scrollY) release();
      else if (target.getBoundingClientRect().top !== top) show();
    };
    const column = target.parentElement;
    const observer =
      column && typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onColumnResize) : null;
    if (column) observer?.observe(column);

    const timer = window.setTimeout(release, HOLD_ANCHOR_MS);
    READER_INPUT.forEach((type) => window.addEventListener(type, release, { passive: true }));
    return release;
  }, [targetId, shownPost]);
}
