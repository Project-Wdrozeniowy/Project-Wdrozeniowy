import { act, render } from '@testing-library/react';
import { vi } from 'vitest';
import { HOLD_ANCHOR_MS, useScrollToComments } from '@/pages/post/lib/useScrollToComments';

/**
 * The comments of a post are scrolled to once the post is shown, and kept in place while the
 * content above them changes height, until the reader takes over.
 */

let notify: (() => void) | null;
let observed: Element[];
let disconnected: number;

/** Like the real one: it reports only while it is observing. */
class FakeResizeObserver {
  constructor(callback: () => void) {
    notify = callback;
  }
  observe = (element: Element) => {
    observed.push(element);
  };
  disconnect = () => {
    disconnected += 1;
    notify = null;
  };
}

/** The content of the column changed height. */
const resize = () => notify?.();

const scrollIntoView = vi.fn();
/** Where the comments are in the window, and how far the page is scrolled. */
let commentsTop: number;
let pageScroll: number;

function Page({ post = 1 as number | null }) {
  useScrollToComments('comments', post);
  return (
    <div data-testid="column">
      <article>Post</article>
      <section>Insights</section>
      <div id="comments">Comments</div>
    </div>
  );
}

beforeEach(() => {
  vi.useFakeTimers();
  observed = [];
  disconnected = 0;
  commentsTop = 0;
  pageScroll = 0;
  scrollIntoView.mockReset();
  // A scroll brings the comments to the top of the window, as the browser does.
  scrollIntoView.mockImplementation(() => {
    pageScroll += commentsTop;
    commentsTop = 0;
  });
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  Element.prototype.scrollIntoView = scrollIntoView;
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(
    () => ({ top: commentsTop }) as DOMRect
  );
  vi.spyOn(window, 'scrollY', 'get').mockImplementation(() => pageScroll);
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('keeping the comments in view for a #comments link', () => {
  it('scrolls to the comments as soon as the post is shown', () => {
    render(<Page />);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(document.getElementById('comments'));
  });

  it('does nothing until a post is shown, or when the link has no fragment', () => {
    render(<Page post={null} />);

    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(observed).toHaveLength(0);
  });

  it('scrolls again when the comments were pushed down by what loaded above them', () => {
    render(<Page />);
    expect(observed).toEqual([document.querySelector('[data-testid="column"]')]);

    // The insights card loaded its figures: the comments are 400px further down.
    commentsTop = 400;
    act(() => resize());

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it('keeps following the comments while they keep moving', () => {
    render(<Page />);

    commentsTop = 400;
    act(() => resize());
    commentsTop = 150;
    act(() => resize());

    expect(scrollIntoView).toHaveBeenCalledTimes(3);
  });

  it('does not pull the reader back when only the comments themselves grow', () => {
    render(<Page />);

    // The list loaded or a comment was posted: the column is taller, the comments have not moved.
    act(() => resize());
    act(() => resize());

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('lets go when the page was moved by something other than us, such as a scrollbar drag', () => {
    render(<Page />);

    pageScroll = 900;
    commentsTop = -500;
    act(() => resize());
    commentsTop = -300;
    act(() => resize());

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(disconnected).toBeGreaterThan(0);
  });

  it.each(['wheel', 'touchstart', 'pointerdown', 'keydown'])(
    'lets the reader take over at the first %s, and never moves the page again',
    (type) => {
      render(<Page />);

      act(() => {
        window.dispatchEvent(new Event(type));
      });
      commentsTop = 400;
      act(() => resize());

      expect(scrollIntoView).toHaveBeenCalledTimes(1);
      expect(disconnected).toBeGreaterThan(0);
    }
  );

  it('lets go by itself after a few seconds, so it cannot hold the page for good', () => {
    render(<Page />);

    act(() => {
      vi.advanceTimersByTime(HOLD_ANCHOR_MS);
    });
    commentsTop = 400;
    act(() => resize());

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('scrolls again for another post, and lets go of the first one', () => {
    const { rerender } = render(<Page post={1} />);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);

    rerender(<Page post={2} />);

    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(disconnected).toBe(1);
  });

  it('does not scroll again when the same post is shown again', () => {
    const { rerender } = render(<Page post={1} />);

    rerender(<Page post={1} />);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('stops observing when the page goes away', () => {
    const { unmount } = render(<Page />);

    unmount();
    commentsTop = 400;
    act(() => resize());

    expect(disconnected).toBeGreaterThan(0);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });

  it('still scrolls once where the browser has no ResizeObserver', () => {
    vi.stubGlobal('ResizeObserver', undefined);

    render(<Page />);

    expect(scrollIntoView).toHaveBeenCalledTimes(1);
  });
});
