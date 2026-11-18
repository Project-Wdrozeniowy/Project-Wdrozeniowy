import { NOTIFICATIONS_LOADING_LABEL } from '@/pages/notifications/config/notifications.const';

export default function NotificationsSkeleton() {
  return (
    <div
      role="status"
      aria-label={NOTIFICATIONS_LOADING_LABEL}
      aria-busy="true"
      className="flex flex-col gap-3"
    >
      {[0, 1, 2].map((row) => (
        <div
          key={row}
          aria-hidden="true"
          className="bg-surface rounded-xl p-4 flex flex-col gap-3 animate-pulse"
        >
          <div className="h-3 w-40 bg-raised rounded" />
          <div className="h-4 w-3/4 bg-raised rounded" />
        </div>
      ))}
    </div>
  );
}
