import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiErrorStatus } from '@/shared/api/client/apiError';
import {
  deleteNotification,
  invalidateListNotifications,
  markAllRead,
  markRead,
} from '@/shared/api/generated/orbita.api';
import {
  NOTIFICATION_DELETE_ERROR,
  NOTIFICATION_GONE_MESSAGE,
  NOTIFICATION_MARK_ALL_ERROR,
  NOTIFICATION_MARK_READ_ERROR,
  NOTIFICATION_TOAST_ID,
} from '@/shared/api/notifications/notification.const';
import { toast } from '@/shared/lib/toast';

/** The page shows our own wording on failure; the global toast would print server text. */
const REQUEST_OPTIONS = { skipErrorToast: true };

/**
 * What to tell the user about a failed change, or `null` to say nothing. A 401 is not a
 * notification problem: the API client has already ended the session. A 404 means the
 * notification is gone (deleted elsewhere), which is also the state the user wanted for a delete.
 */
export function notificationFailureMessage(error: unknown, fallback: string): string | null {
  const status = apiErrorStatus(error);
  if (status === 401) return null;
  if (status === 404) return NOTIFICATION_GONE_MESSAGE;
  return fallback;
}

/**
 * One hook per change. After each change the server's answer is what the screen shows: every
 * `/notifications` query (the list and the unread count) is refetched, whether the change worked
 * or failed, so a failure never leaves a stale list or badge behind.
 */
function useNotificationMutation<TVariables>(
  request: (variables: TVariables) => Promise<unknown>,
  fallbackMessage: string
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: request,
    onError: (error: unknown) => {
      const message = notificationFailureMessage(error, fallbackMessage);
      if (message) toast.error(message, NOTIFICATION_TOAST_ID);
    },
    // Not returned: the change is done once the server answered; the refetch must not keep it pending.
    onSettled: () => {
      void invalidateListNotifications(queryClient);
    },
  });
}

export function useMarkNotificationRead() {
  return useNotificationMutation(
    (id: number) => markRead(id, REQUEST_OPTIONS),
    NOTIFICATION_MARK_READ_ERROR
  );
}

export function useMarkAllNotificationsRead() {
  return useNotificationMutation<void>(
    () => markAllRead(REQUEST_OPTIONS),
    NOTIFICATION_MARK_ALL_ERROR
  );
}

export function useDeleteNotification() {
  return useNotificationMutation(
    (id: number) => deleteNotification(id, REQUEST_OPTIONS),
    NOTIFICATION_DELETE_ERROR
  );
}
