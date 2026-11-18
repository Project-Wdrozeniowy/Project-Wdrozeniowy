import { AxiosError } from 'axios';
import { notificationFailureMessage } from '../useNotificationActions';
import { NOTIFICATION_GONE_MESSAGE } from '../notification.const';

function httpError(status: number, data?: unknown) {
  const error = new AxiosError('failed');
  error.response = { status, data } as AxiosError['response'];
  return error;
}

describe('notificationFailureMessage', () => {
  it('says nothing for a 401: the API client has already ended the session', () => {
    expect(notificationFailureMessage(httpError(401), 'fallback')).toBeNull();
  });

  it('says the notification is gone for a 404', () => {
    expect(notificationFailureMessage(httpError(404), 'fallback')).toBe(NOTIFICATION_GONE_MESSAGE);
  });

  it('uses our own fallback for everything else, never the server text', () => {
    expect(notificationFailureMessage(httpError(500, { detail: 'SQL exploded' }), 'fallback')).toBe(
      'fallback'
    );
    expect(notificationFailureMessage(httpError(403), 'fallback')).toBe('fallback');
    expect(notificationFailureMessage(new Error('Network Error'), 'fallback')).toBe('fallback');
  });
});
