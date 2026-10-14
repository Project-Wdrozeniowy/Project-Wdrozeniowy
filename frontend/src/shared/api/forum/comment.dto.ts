import type { UserSummary } from '@/shared/api/user/user.dto';

export type CommentStatus = 'VISIBLE' | 'HIDDEN' | 'DELETED';

export interface Comment {
  id: number;
  postId: number;
  parentId: number | null;
  /** Can be `null` when the comment is deleted (it is then shown as a placeholder). */
  content: string | null;
  status: CommentStatus;
  voteScore: number;
  depth: number;
  /** Can be `null` when the comment is deleted. */
  author: UserSummary | null;
  replies: Comment[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCommentRequest {
  content: string;
  parentId?: number;
}

export interface UpdateCommentRequest {
  content: string;
}
