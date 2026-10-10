import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import CommentItem from '../CommentItem';
import type { Comment, UserProfile } from '@/shared/types';

const alice: UserProfile = {
  id: 1,
  username: 'alice',
  displayName: 'Alice',
  avatarUrl: null,
  bio: null,
  role: 'USER',
  status: 'ACTIVE',
  postCount: 0,
  commentCount: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
};

function makeComment(overrides: Partial<Comment> = {}): Comment {
  return {
    id: 10,
    postId: 1,
    parentId: null,
    content: 'hello there',
    status: 'VISIBLE',
    voteScore: 0,
    depth: 0,
    author: { id: 1, username: 'alice', displayName: 'Alice', avatarUrl: null, role: 'USER' },
    replies: [],
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function renderItem(comment: Comment, user: UserProfile | null = alice, handlers = {}) {
  const props = {
    onReply: vi.fn().mockResolvedValue(undefined),
    onDelete: vi.fn().mockResolvedValue(undefined),
    getErrorMessage: () => 'Delete failed',
    ...handlers,
  };
  render(
    <ul>
      <CommentItem comment={comment} user={user} {...props} />
    </ul>
  );
  return { ...props, user: userEvent.setup() };
}

describe('CommentItem', () => {
  it('renders author and content', () => {
    renderItem(makeComment());
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('hello there')).toBeInTheDocument();
  });

  it('renders a placeholder for deleted comments, with no actions', () => {
    renderItem(makeComment({ status: 'DELETED', content: null, author: null }));
    expect(screen.getByText('[comment deleted]')).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows Delete to the author', () => {
    renderItem(makeComment());
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument();
  });

  it('hides Delete and Reply from guests', () => {
    renderItem(makeComment(), null);
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument();
  });

  it('hides Delete from other regular users', () => {
    renderItem(makeComment(), { ...alice, id: 2 });
    expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  });

  it('hides Reply at the maximum depth', () => {
    renderItem(makeComment({ depth: 5 }));
    expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument();
  });

  it('calls onDelete with the comment id', async () => {
    const { user, onDelete } = renderItem(makeComment());
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await waitFor(() => expect(onDelete).toHaveBeenCalledWith(10));
  });

  it('shows the error when deleting fails', async () => {
    const { user } = renderItem(makeComment(), alice, {
      onDelete: vi.fn().mockRejectedValue(new Error('500')),
    });
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Delete failed');
  });

  it('opens a reply form and submits it with the parent id', async () => {
    const { user, onReply } = renderItem(makeComment());
    await user.click(screen.getByRole('button', { name: 'Reply' }));
    await user.type(screen.getByLabelText('Reply to Alice'), 'a reply');
    await user.click(screen.getByRole('button', { name: 'Post reply' }));

    await waitFor(() => expect(onReply).toHaveBeenCalledWith(10, 'a reply'));
    await waitFor(() => expect(screen.queryByLabelText('Reply to Alice')).not.toBeInTheDocument());
  });

  it('renders nested replies recursively', () => {
    const grandchild = makeComment({ id: 12, depth: 2, content: 'deep reply' });
    const reply = makeComment({ id: 11, depth: 1, content: 'a reply', replies: [grandchild] });
    renderItem(makeComment({ replies: [reply] }));
    expect(screen.getByText('a reply')).toBeInTheDocument();
    expect(screen.getByText('deep reply')).toBeInTheDocument();
  });
});
