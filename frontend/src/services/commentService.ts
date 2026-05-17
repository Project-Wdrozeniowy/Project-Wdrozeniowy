import { apiClient } from './api';
import type { Comment, CreateCommentPayload, PaginatedResponse } from '@/shared/types';

export const commentService = {
  getComments: (postId: string, page = 0, size = 20): Promise<PaginatedResponse<Comment>> =>
    apiClient.get<PaginatedResponse<Comment>>(
      `/forum/posts/${postId}/comments?page=${page}&size=${size}`
    ),

  addComment: (postId: string, payload: CreateCommentPayload): Promise<Comment> =>
    apiClient.post<Comment>(`/forum/posts/${postId}/comments`, payload),

  deleteComment: (commentId: string): Promise<void> =>
    apiClient.delete<void>(`/forum/comments/${commentId}`),
};
