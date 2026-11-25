import { act, render } from '@testing-library/react';
import { vi } from 'vitest';
import useDashboardScroll from '../useDashboardScroll';

let key = 'dashboard-entry';
let navigationType = 'POP';
vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({
    useLocation: () => ({ key }),
    useNavigationType: () => navigationType,
  })
);

function Screen() {
  const ref = useDashboardScroll();
  return <div ref={ref}>Asynchronously loaded dashboard</div>;
}

let resize: () => void;
let height = 200;
beforeEach(() => {
  key = 'dashboard-entry';
  navigationType = 'POP';
  sessionStorage.clear();
  vi.useFakeTimers();
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        resize = callback;
      }
      observe() {}
      disconnect() {}
    }
  );
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    get: () => height,
  });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: 600 });
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
  vi.spyOn(window, 'scrollTo').mockImplementation((_x, y) => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: y, writable: true });
  });
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function savePosition() {
  height = 2000;
  const view = render(<Screen />);
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 900, writable: true });
  window.dispatchEvent(new Event('scroll'));
  view.unmount();
  Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
}

it('restores the saved history entry after asynchronous content grows enough', () => {
  savePosition();
  height = 200;
  render(<Screen />);
  act(() => vi.advanceTimersByTime(30));
  expect(window.scrollY).toBe(0);
  height = 2000;
  act(() => {
    resize();
    vi.advanceTimersByTime(30);
  });
  expect(window.scrollY).toBe(900);
});

it.each(['keydown', 'pointerdown', 'click'])(
  'captures the departure position on %s before a queued scroll event arrives',
  (event) => {
    height = 2000;
    const view = render(<Screen />);
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 900, writable: true });
    // Browser can deliver the scroll event after navigation has already unmounted the old screen.
    window.dispatchEvent(new Event(event));
    view.unmount();
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0, writable: true });
    render(<Screen />);
    act(() => vi.advanceTimersByTime(30));
    expect(window.scrollY).toBe(900);
  }
);

it.each(['wheel', 'pointerdown', 'touchstart', 'keydown'])(
  'stops delayed restoration on user %s',
  (event) => {
    savePosition();
    height = 200;
    render(<Screen />);
    window.dispatchEvent(new Event(event));
    height = 2000;
    act(() => {
      resize();
      vi.advanceTimersByTime(30);
    });
    expect(window.scrollY).toBe(0);
  }
);

it('does not reuse another history entry or restore position during a setting replacement', () => {
  savePosition();
  navigationType = 'REPLACE';
  const view = render(<Screen />);
  act(() => vi.advanceTimersByTime(30));
  expect(window.scrollY).toBe(0);
  view.unmount();
  key = 'another-entry';
  navigationType = 'POP';
  render(<Screen />);
  act(() => vi.advanceTimersByTime(30));
  expect(window.scrollY).toBe(0);
});

it('tolerates unavailable session storage and finishes bounded restoration when content stays short', () => {
  savePosition();
  height = 800;
  const view = render(<Screen />);
  act(() => vi.advanceTimersByTime(5100));
  expect(window.scrollY).toBe(200);
  view.unmount();
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('Blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('Blocked');
  });
  const blocked = render(<Screen />);
  expect(() => blocked.unmount()).not.toThrow();
});
