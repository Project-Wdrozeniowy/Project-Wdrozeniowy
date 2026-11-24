import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/shared/api/client/api';
import { invalidateListNotifications } from '@/shared/api/generated/orbita.api';
import { sessionEvents } from '@/shared/auth/sessionEvents';
import { startNotificationStream } from '@/shared/api/websocket/notificationStream';
import { useStore } from '@/store';

/** One connection per authenticated tab; synchronous generation cancellation precedes React cleanup. */
export default function NotificationProvider() {
  const authenticated = useStore((state) => state.isAuthenticated);
  const cache = useQueryClient();
  useEffect(() => {
    if (!authenticated) return;
    const { controller, release } = sessionEvents.controller();
    const stop = startNotificationStream({
      signal: controller.signal,
      csrf: () => apiClient.csrfToken(),
      refresh: () => invalidateListNotifications(cache),
      probe: () =>
        apiClient.get('/ws/info', { baseURL: '', signal: controller.signal, skipErrorToast: true }),
      protocolFailure: () => {
        sessionEvents.advance();
        useStore.getState().setSessionStatus('error');
      },
    });
    return () => {
      controller.abort();
      stop();
      release();
    };
  }, [authenticated, cache]);
  return null;
}
