import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import PostCard from '@/widgets/post-feed/ui/PostCard';
import { useStore } from '@/store';
import { ACTION_UNAVAILABLE_HINT } from '@/widgets/post-feed/config/postCard.const';
import type { PostCardData } from '@/widgets/post-feed/lib/postCard';

const post: PostCardData = {
  id: '1',
  slug: 'hello-world',
  username: 'alice',
  userInitial: 'A',
  timeAgo: '2 hours ago',
  badge: null,
  category: 'Gaming',
  categorySlug: 'gaming',
  title: 'Hello world',
  excerpt: null,
  votes: 12,
  comments: 3,
  tags: [],
  voting: { postId: 5, myVote: null },
};

vi.mock('react-router', async () =>
  (await import('@/test/routerMock')).routerMock({ useNavigate: () => vi.fn() })
);

beforeEach(() => useStore.setState({ isAuthenticated: false, isInitialized: true }));

function renderCard(data: PostCardData) {
  const client = new QueryClient();
  const ui = (value: PostCardData) => (
    <QueryClientProvider client={client}>
      <PostCard post={value} />
    </QueryClientProvider>
  );
  const result = render(ui(data));
  return { ...result, rerenderCard: (value: PostCardData) => result.rerender(ui(value)) };
}

describe('PostCard', () => {
  it('renders the title as a heading that holds the link to the post', () => {
    renderCard(post);
    const heading = screen.getByRole('heading', { name: 'Hello world' });
    expect(within(heading).getByRole('link', { name: 'Hello world' })).toBeInTheDocument();
  });

  it('renders no excerpt paragraph when the API provides none', () => {
    const { container } = renderCard(post);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the excerpt when present', () => {
    renderCard({ ...post, excerpt: 'A short preview' });
    expect(screen.getByText('A short preview')).toBeInTheDocument();
  });

  it('omits the category chip when the post has no category', () => {
    renderCard({ ...post, category: null });
    expect(screen.queryByText('Gaming')).not.toBeInTheDocument();
  });

  it('colors the chip by category slug even when the name differs from our topic labels', () => {
    renderCard({ ...post, category: 'Technology', categorySlug: 'ai' });
    expect(screen.getByText('Technology')).toHaveClass('border-cat-ai/40');
  });

  it('renders an unknown category with the fallback style', () => {
    renderCard({ ...post, category: 'Something New', categorySlug: 'something-new' });
    expect(screen.getByText('Something New')).toHaveClass('border-line-strong');
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'uses the fallback style for a category named "%s"',
    (name) => {
      renderCard({ ...post, category: name, categorySlug: name });
      expect(screen.getByText(name)).toHaveClass('border-line-strong');
    }
  );

  it('shows counts and the author', () => {
    renderCard({ ...post, votes: 1500, badge: 'pinned' });
    expect(screen.getByText('1.5k')).toBeInTheDocument();
    expect(screen.getByText('3 Comments')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('pinned')).toBeInTheDocument();
  });

  it('follows the vote count of the post when fresh data arrives', () => {
    const { rerenderCard } = renderCard({ ...post, votes: 12 });
    expect(screen.getByText('12')).toBeInTheDocument();

    rerenderCard({ ...post, votes: 20 });
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('keeps the vote buttons enabled: voting works through the API', () => {
    renderCard(post);
    for (const name of ['Upvote', 'Downvote']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeEnabled();
      expect(button).not.toHaveAttribute('title');
    }
  });

  it('highlights the direction the user already voted', () => {
    renderCard({ ...post, voting: { postId: 5, myVote: { id: 9, voteType: 'DOWN' } } });
    expect(screen.getByRole('button', { name: 'Downvote' })).toHaveClass('text-danger');
    expect(screen.getByRole('button', { name: 'Upvote' })).not.toHaveClass('text-accent');
  });

  it('does not move the score by itself when the vote is not saved', async () => {
    renderCard({ ...post, votes: 10 });
    // Not signed in here, so the click only navigates (covered in the feed tests).
    await userEvent.setup().click(screen.getByRole('button', { name: 'Upvote' }));
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('links the title and the comments to the post page', () => {
    renderCard(post);

    expect(screen.getByRole('link', { name: 'Hello world' })).toHaveAttribute(
      'href',
      '/forum/hello-world'
    );
    expect(screen.getByRole('link', { name: '3 Comments on Hello world' })).toHaveAttribute(
      'href',
      '/forum/hello-world#comments'
    );
  });

  it('says which post the comments link belongs to, and keeps the visible text first', () => {
    renderCard(post);

    const link = screen.getByRole('link', { name: /Comments/ });
    // A list of links reads "3 Comments on Hello world", not the same words once per card.
    expect(link).toHaveAccessibleName('3 Comments on Hello world');
    expect(link.textContent).toBe('3 Comments');
  });

  it.each([
    [0, '0 Comments'],
    [1, '1 Comment'],
    [2, '2 Comments'],
  ])('writes %i comments as "%s"', (comments, text) => {
    renderCard({ ...post, comments });

    expect(screen.getByRole('link', { name: new RegExp(`^${text} on`) })).toHaveTextContent(
      new RegExp(`^${text}$`)
    );
  });

  it('encodes a slug that needs it in the address of the post', () => {
    renderCard({ ...post, slug: 'a b/c' });

    expect(screen.getByRole('link', { name: 'Hello world' })).toHaveAttribute(
      'href',
      '/forum/a%20b%2Fc'
    );
  });

  it('encodes a slug with non-ASCII letters', () => {
    renderCard({ ...post, slug: 'zażółć-gęślą' });

    expect(screen.getByRole('link', { name: 'Hello world' })).toHaveAttribute(
      'href',
      `/forum/${encodeURIComponent('zażółć-gęślą')}`
    );
  });

  it('disables share and save with an explanation', () => {
    renderCard(post);
    for (const name of ['Share', 'Save']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('title', ACTION_UNAVAILABLE_HINT);
    }
  });

  it('renders no tag list when the post has no tags', () => {
    renderCard(post);
    expect(screen.queryByRole('list', { name: 'Tags' })).not.toBeInTheDocument();
  });

  it('renders each tag as a link to the feed of that tag', () => {
    renderCard({
      ...post,
      tags: [
        { name: 'react', slug: 'react' },
        { name: 'C++', slug: 'c-plus-plus' },
      ],
    });
    const list = screen.getByRole('list', { name: 'Tags' });
    expect(within(list).getByRole('link', { name: '#react' })).toHaveAttribute(
      'href',
      '/forum?tag=react'
    );
    expect(within(list).getByRole('link', { name: '#C++' })).toHaveAttribute(
      'href',
      '/forum?tag=c-plus-plus'
    );
  });
});
