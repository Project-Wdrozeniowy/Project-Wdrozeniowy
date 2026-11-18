// Adapter mocks are isolated tests, not real API acceptance. Comments are published; PWDRZ-67 retains full acceptance ownership. Category/tag work keeps its existing owners.
import { vi } from 'vitest';
import type { PagedResponse } from '@/shared/api/client/pagination.dto';
import type { CategoryDto as Category } from '@/shared/api/generated/models/categoryDto.dto';
import type { Comment } from '@/shared/api/forum/comment.dto';
import type { PostSummaryDto as PostSummary } from '@/shared/api/generated/models/postSummaryDto.dto';
import type { TagDto as Tag } from '@/shared/api/generated/models/tagDto.dto';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/shared/api/client/api', () => ({
  apiClient: mockApiClient,
}));

const { categoryService, commentService, tagService } =
  await import('@/shared/api/forum/forumClient');

const mockAuthor = {
  id: 1,
  username: 'john',
  displayName: 'John' as string | null,
  avatarUrl: null,
  role: 'USER' as const,
};

const mockCategory: Category = {
  id: 1,
  name: 'General',
  slug: 'general',
  description: 'General discussion',
  displayOrder: 1,
  visible: true,
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockPostSummary: PostSummary = {
  id: 1,
  title: 'Hello World',
  slug: 'hello-world',
  status: 'PUBLISHED',
  pinned: false,
  viewCount: 0,
  voteScore: 0,
  myVote: null,
  tags: [],
  commentCount: 0,
  category: mockCategory,
  author: mockAuthor,
  lastActivityAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockComment: Comment = {
  id: 1,
  postId: 1,
  parentId: null,
  content: 'Nice post!',
  status: 'VISIBLE',
  voteScore: 0,
  depth: 0,
  author: { id: 2, username: 'jane', displayName: 'Jane', avatarUrl: null, role: 'USER' as const },
  replies: [],
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

const mockTag: Tag = { id: 1, name: 'typescript', slug: 'typescript', postCount: 5 };

function pagedOf<T>(item: T): PagedResponse<T> {
  return {
    content: [item],
    totalElements: 1,
    totalPages: 1,
    page: 0,
    size: 20,
    first: true,
    last: true,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── categoryService ──────────────────────────────────────────────────────────

describe('categoryService.create >-65 POST /forum/categories', () => {
  it('calls apiClient.post with /forum/categories and data', async () => {
    const data = { name: 'General', slug: 'general', description: 'General discussion' };
    mockApiClient.post.mockResolvedValue(mockCategory);
    const result = await categoryService.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/forum/categories', data);
    expect(result).toEqual(mockCategory);
  });
});

describe('categoryService.update >-65 PATCH /forum/categories/:slug', () => {
  it('calls apiClient.patch with /forum/categories/general and data', async () => {
    const data = { description: 'Updated' };
    mockApiClient.patch.mockResolvedValue({ ...mockCategory, description: 'Updated' });
    const result = await categoryService.update('general', data);
    expect(mockApiClient.patch).toHaveBeenCalledWith('/forum/categories/general', data);
    expect(result.description).toBe('Updated');
  });
});

describe('categoryService.delete >-65 DELETE /forum/categories/:slug', () => {
  it('calls apiClient.delete with /forum/categories/general', async () => {
    mockApiClient.delete.mockResolvedValue(undefined);
    await categoryService.delete('general');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/forum/categories/general');
  });
});

// ─── postService ──────────────────────────────────────────────────────────────

describe('commentService.list >-65 GET /forum/posts/:slug/comments', () => {
  it('calls apiClient.get with default pagination', async () => {
    const paged = pagedOf(mockComment);
    mockApiClient.get.mockResolvedValue(paged);
    const result = await commentService.list('hello-world');
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/posts/hello-world/comments', {
      params: { page: 0, size: 20 },
    });
    expect(result).toEqual(paged);
  });

  it('passes custom page and size', async () => {
    mockApiClient.get.mockResolvedValue(pagedOf(mockComment));
    await commentService.list('hello-world', 2, 10);
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/posts/hello-world/comments', {
      params: { page: 2, size: 10 },
    });
  });
});

describe('commentService.create >-65 POST /forum/posts/:slug/comments', () => {
  it('calls apiClient.post with /forum/posts/:slug/comments and data', async () => {
    const data = { content: 'Nice post!' };
    mockApiClient.post.mockResolvedValue(mockComment);
    const result = await commentService.create('hello-world', data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/forum/posts/hello-world/comments', data);
    expect(result).toEqual(mockComment);
  });
});

describe('commentService.update >-65 PATCH /forum/comments/:id', () => {
  it('calls apiClient.patch with /forum/comments/:id and data', async () => {
    const data = { content: 'Edited comment' };
    mockApiClient.patch.mockResolvedValue({ ...mockComment, content: 'Edited comment' });
    const result = await commentService.update(1, data);
    expect(mockApiClient.patch).toHaveBeenCalledWith('/forum/comments/1', data);
    expect(result.content).toBe('Edited comment');
  });
});

describe('commentService.delete >-65 DELETE /forum/comments/:id', () => {
  it('calls apiClient.delete with /forum/comments/:id', async () => {
    mockApiClient.delete.mockResolvedValue(undefined);
    await commentService.delete(1);
    expect(mockApiClient.delete).toHaveBeenCalledWith('/forum/comments/1');
  });
});

// ─── tagService ───────────────────────────────────────────────────────────────

describe('tagService.list >-65 GET /forum/tags', () => {
  it('calls apiClient.get with /forum/tags', async () => {
    mockApiClient.get.mockResolvedValue([mockTag]);
    const result = await tagService.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/tags');
    expect(result).toEqual([mockTag]);
  });
});

describe('tagService.listPosts >-65 GET /forum/tags/:slug/posts', () => {
  it('calls apiClient.get with default pagination', async () => {
    const paged = pagedOf(mockPostSummary);
    mockApiClient.get.mockResolvedValue(paged);
    const result = await tagService.listPosts('typescript');
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/tags/typescript/posts', {
      params: { page: 0, size: 20 },
    });
    expect(result).toEqual(paged);
  });
});

// ─── voteService ──────────────────────────────────────────────────────────────
