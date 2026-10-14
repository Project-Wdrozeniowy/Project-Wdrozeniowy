export type NotificationType =
  | 'COMMENT_ON_POST'
  | 'REPLY_TO_COMMENT'
  | 'VOTE_ON_POST'
  | 'VOTE_ON_COMMENT'
  | 'MENTION'
  | 'POST_LOCKED'
  | 'SYSTEM';

export interface Notification {
  id: number;
  senderUsername: string | null;
  type: NotificationType;
  entityType: 'POST' | 'COMMENT' | null;
  entityId: number | null;
  message: string;
  read: boolean;
  createdAt: string;
}
