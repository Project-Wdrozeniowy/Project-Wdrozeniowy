import { NOTIFICATIONS_TITLE } from '@/pages/notifications/config/notifications.const';
import NotificationsView from './NotificationsView';

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-fg font-bold text-2xl">{NOTIFICATIONS_TITLE}</h1>
      <NotificationsView />
    </div>
  );
}
