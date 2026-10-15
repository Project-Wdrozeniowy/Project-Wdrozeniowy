import type { Category } from './category.dto';
import type { Tag } from './tag.dto';
import type { MyVote } from './vote.dto';
import type { UserSummary } from '@/shared/api/user/user.dto';

export type PostStatus = 'PUBLISHED' | 'DRAFT' | 'LOCKED' | 'DELETED';

export interface PostSummary {
  id: number;
  title: string;
  slug: string;
  status: PostStatus;
  pinned: boolean;
  viewCount: number;
  voteScore: number;
  /** The caller's own vote, `null` when they have not voted (or are signed out). */
  myVote: MyVote | null;
  commentCount: number;
  /** `null` when the category was deleted after the post was created. */
  category: Category | null;
  author: UserSummary;
  lastActivityAt: string;
  createdAt: string;
}

export interface Post extends PostSummary {
  content: string;
  tags: Tag[];
  updatedAt: string;
}

export interface CreatePostRequest {
  title: string;
  content: string;
  categoryId: number;
  tags?: string[];
  draft?: boolean;
}

export interface UpdatePostRequest {
  title?: string;
  content?: string;
  categoryId?: number;
  tags?: string[];
  status?: 'PUBLISHED' | 'DRAFT' | 'LOCKED';
}
