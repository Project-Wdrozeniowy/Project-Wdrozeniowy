import { vi } from 'vitest';
import type { PagedResponse, Category, Post, PostSummary, Comment, Tag } from '@/types';

const mockApiClient = {
  get: vi.fn(),
  post: vi.fn(),
  patch: vi.fn(),
  delete: vi.fn(),
};

vi.mock('@/services/api', () => ({
  apiClient: mockApiClient,
}));

const { categoryService, postService, commentService, tagService, voteService } =
  await import('@/services/forumService');

const mockAuthor = { id: 1, username: 'john', displayName: 'John' as string | null, avatarUrl: null, role: 'USER' as const };

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
  commentCount: 0,
  category: mockCategory,
  author: mockAuthor,
  lastActivityAt: '2024-01-01T00:00:00.000Z',
  createdAt: '2024-01-01T00:00:00.000Z',
};

const mockPost: Post = {
  ...mockPostSummary,
  content: 'Post content',
  tags: [],
  updatedAt: '2024-01-01T00:00:00.000Z',
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
  return { content: [item], totalElements: 1, totalPages: 1, page: 0, size: 20, first: true, last: true };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── categoryService ──────────────────────────────────────────────────────────

describe('categoryService.list >-65 GET /forum/categories', () => {
  it('calls apiClient.get with /forum/categories', async () => {
    mockApiClient.get.mockResolvedValue([mockCategory]);
    const result = await categoryService.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/categories');
    expect(result).toEqual([mockCategory]);
  });
});

describe('categoryService.get >-65 GET /forum/categories/:slug', () => {
  it('calls apiClient.get with /forum/categories/general', async () => {
    mockApiClient.get.mockResolvedValue(mockCategory);
    const result = await categoryService.get('general');
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/categories/general');
    expect(result).toEqual(mockCategory);
  });
});

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

describe('postService.list >-65 GET /forum/posts', () => {
  it('calls apiClient.get with /forum/posts and default params', async () => {
    const paged = pagedOf(mockPostSummary);
    mockApiClient.get.mockResolvedValue(paged);
    const result = await postService.list();
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/posts', { params: {} });
    expect(result).toEqual(paged);
  });

  it('passes filter params', async () => {
    mockApiClient.get.mockResolvedValue(pagedOf(mockPostSummary));
    await postService.list({ categorySlug: 'general', tag: 'typescript', q: 'hello', page: 1 });
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/posts', {
      params: { categorySlug: 'general', tag: 'typescript', q: 'hello', page: 1 },
    });
  });
});

describe('postService.get >-65 GET /forum/posts/:slug', () => {
  it('calls apiClient.get with /forum/posts/hello-world', async () => {
    mockApiClient.get.mockResolvedValue(mockPost);
    const result = await postService.get('hello-world');
    expect(mockApiClient.get).toHaveBeenCalledWith('/forum/posts/hello-world');
    expect(result).toEqual(mockPost);
  });
});

describe('postService.create >-65 POST /forum/posts', () => {
  it('calls apiClient.post with /forum/posts and data', async () => {
    const data = { title: 'Hello World', content: 'Content', categoryId: 1 };
    mockApiClient.post.mockResolvedValue(mockPost);
    const result = await postService.create(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/forum/posts', data);
    expect(result).toEqual(mockPost);
  });
});

describe('postService.update >-65 PATCH /forum/posts/:slug', () => {
  it('calls apiClient.patch with /forum/posts/hello-world and data', async () => {
    const data = { title: 'Updated Title' };
    mockApiClient.patch.mockResolvedValue({ ...mockPost, title: 'Updated Title' });
    const result = await postService.update('hello-world', data);
    expect(mockApiClient.patch).toHaveBeenCalledWith('/forum/posts/hello-world', data);
    expect(result.title).toBe('Updated Title');
  });
});

describe('postService.delete >-65 DELETE /forum/posts/:slug', () => {
  it('calls apiClient.delete with /forum/posts/hello-world', async () => {
    mockApiClient.delete.mockResolvedValue(undefined);
    await postService.delete('hello-world');
    expect(mockApiClient.delete).toHaveBeenCalledWith('/forum/posts/hello-world');
  });
});

describe('postService.togglePin >-65 PATCH /forum/posts/:slug/pin', () => {
  it('calls apiClient.patch with /forum/posts/hello-world/pin', async () => {
    mockApiClient.patch.mockResolvedValue({ ...mockPost, pinned: true });
    const result = await postService.togglePin('hello-world');
    expect(mockApiClient.patch).toHaveBeenCalledWith('/forum/posts/hello-world/pin', null);
    expect(result.pinned).toBe(true);
  });
});

// ─── commentService ───────────────────────────────────────────────────────────

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

describe('voteService.cast >-65 POST /forum/votes', () => {
  it('calls apiClient.post with /forum/votes and vote data', async () => {
    const data = { entityType: 'POST' as const, entityId: 1, voteType: 'UP' as const };
    const response = { id: 10, entityType: 'POST', entityId: 1, voteType: 'UP', newScore: 1 };
    mockApiClient.post.mockResolvedValue(response);
    const result = await voteService.cast(data);
    expect(mockApiClient.post).toHaveBeenCalledWith('/forum/votes', data);
    expect(result).toEqual(response);
  });
});

describe('voteService.retract >-65 DELETE /forum/votes/:id', () => {
  it('calls apiClient.delete with /forum/votes/:id', async () => {
    mockApiClient.delete.mockResolvedValue(undefined);
    await voteService.retract(10);
    expect(mockApiClient.delete).toHaveBeenCalledWith('/forum/votes/10');
  });
});
