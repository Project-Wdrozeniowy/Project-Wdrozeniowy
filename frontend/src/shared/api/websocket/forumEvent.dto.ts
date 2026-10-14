/** Pushed to /topic/posts/{postId}/comments */
export interface NewCommentEvent {
  commentId: number;
  postId: number;
  parentId: number | null;
  authorUsername: string;
  content: string;
  depth: number;
  createdAt: string;
}

/** Pushed to /topic/posts/{postId}/votes */
export interface VoteScoreEvent {
  entityType: 'POST' | 'COMMENT';
  entityId: number;
  newScore: number;
}
