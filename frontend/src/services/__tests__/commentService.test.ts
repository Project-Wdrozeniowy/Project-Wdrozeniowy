import { vi } from 'vitest';
import type { ApiResponse, Comment, PaginatedResponse } from '@/shared/types';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/services/api', () => ({
  apiClient: mockApiClient,
}));

const { commentService } = await import('@/services/commentService');

const mockComment: Comment = {
  id: '1',
  postId: '10',
  parentId: null,
  content: 'Great post!',
  status: 'VISIBLE',
  voteScore: 0,
  depth: 0,
  author: {
    id: '42',
    username: 'testuser',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'user',
    status: 'active',
    postCount: 0,
    commentCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  replies: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const mockPage: PaginatedResponse<Comment> = {
  content: [mockComment],
  totalElements: 1,
  totalPages: 1,
  number: 0,
  size: 20,
  last: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('commentService.getComments', () => {
  it('calls apiClient.get with correct URL', async () => {
    mockApiClient.get.mockResolvedValue(mockPage);
    const result = await commentService.getComments('10', 0);
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/posts/10/comments?page=0&size=20');
    expect(result.content).toHaveLength(1);
  });

  it('uses default page=0 and size=20', async () => {
    mockApiClient.get.mockResolvedValue(mockPage);
    await commentService.getComments('10');
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/posts/10/comments?page=0&size=20');
  });
});

describe('commentService.addComment', () => {
  it('calls apiClient.post with correct URL and payload', async () => {
    mockApiClient.post.mockResolvedValue(mockComment);
    const payload = { content: 'Great post!', parentId: null };
    const result = await commentService.addComment('10', payload);
    expect(mockApiClient.post).toHaveBeenCalledWith('/forum/posts/10/comments', payload);
    expect(result).toEqual(mockComment);
  });
});

describe('commentService.deleteComment', () => {
  it('calls apiClient.delete with correct URL', async () => {
    mockApiClient.delete.mockResolvedValue(undefined);
    await commentService.deleteComment('1');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/forum/comments/1');
  });
});
