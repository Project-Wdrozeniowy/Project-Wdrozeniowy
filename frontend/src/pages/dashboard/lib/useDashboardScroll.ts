import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router';

const storageKey = 'orbita.dashboard.positions';
function positions(): Record<string, number> {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(storageKey) ?? '{}');
    if (!value || typeof value !== 'object') return {};
    return Object.fromEntries(
      Object.entries(value).filter(([, y]) => typeof y === 'number' && Number.isFinite(y) && y >= 0)
    );
  } catch {
    return {};
  }
}

/** Screen-local completion of Router scroll restoration after async dashboard content grows. */
export default function useDashboardScroll() {
  const ref = useRef<HTMLDivElement>(null);
  const { key } = useLocation();
  const navigationType = useNavigationType();
  useEffect(() => {
    const target = navigationType === 'POP' ? positions()[key] : undefined;
    let pending = target !== undefined;
    let lastY = target ?? window.scrollY;
    let frame = 0;
    let observer: ResizeObserver | undefined;
    let timer: number | undefined;
    const stop = () => {
      pending = false;
      lastY = window.scrollY;
      observer?.disconnect();
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
    const attempt = () => {
      if (!pending) return;
      const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      if (max >= target!) {
        window.scrollTo(0, target!);
        stop();
      }
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(attempt);
    };
    const remember = () => {
      if (!pending) lastY = window.scrollY;
    };
    const persist = () => {
      try {
        const previous = Object.entries(positions())
          .filter(([entry]) => entry !== key)
          .slice(-19);
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ ...Object.fromEntries(previous), [key]: lastY })
        );
      } catch {
        /* Session storage can be blocked; Router still owns ordinary restoration. */
      }
    };
    const pageHide = () => {
      remember();
      persist();
    };
    const interrupt = () => {
      if (pending) stop();
    };
    window.addEventListener('scroll', remember, { passive: true });
    window.addEventListener('pagehide', pageHide);
    const inputs = ['wheel', 'pointerdown', 'touchstart', 'keydown'] as const;
    inputs.forEach((event) => window.addEventListener(event, interrupt, { passive: true }));
    if (pending) {
      if (typeof ResizeObserver !== 'undefined' && ref.current) {
        observer = new ResizeObserver(schedule);
        observer.observe(ref.current);
      }
      schedule();
      timer = window.setTimeout(() => {
        if (pending) {
          window.scrollTo(
            0,
            Math.min(target!, Math.max(0, document.documentElement.scrollHeight - innerHeight))
          );
          stop();
        }
      }, 5000);
    }
    return () => {
      persist();
      observer?.disconnect();
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      window.removeEventListener('scroll', remember);
      window.removeEventListener('pagehide', pageHide);
      inputs.forEach((event) => window.removeEventListener(event, interrupt));
    };
  }, [key, navigationType]);
  return ref;
}
