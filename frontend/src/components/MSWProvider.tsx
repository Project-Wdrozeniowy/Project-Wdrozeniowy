'use client';

import { useEffect, useState, type ReactNode } from 'react';

async function enableMocking() {
  if (process.env.NODE_ENV !== 'development') return;
  const { worker } = await import('@/mocks/browser');
  return worker.start({ onUnhandledRequest: 'bypass' });
}

export default function MSWProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(process.env.NODE_ENV !== 'development');

  useEffect(() => {
    enableMocking().then(() => setReady(true));
  }, []);

  if (!ready) return null;
  return <>{children}</>;
}
