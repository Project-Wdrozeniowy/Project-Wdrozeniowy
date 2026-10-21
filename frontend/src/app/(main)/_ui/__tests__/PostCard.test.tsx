import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import PostCard from '../PostCard';
import { useStore } from '@/store';
import { ACTION_UNAVAILABLE_HINT } from '@/app/(main)/_ui/postCard.const';
import type { PostCardData } from '@/app/(main)/_lib/postCard';

const post: PostCardData = {
  id: '1',
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

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));

beforeEach(() => useStore.setState({ user: null, isAuthenticated: false, isInitialized: true }));

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
  it('renders the title as a heading, not a link', () => {
    renderCard(post);
    expect(screen.getByRole('heading', { name: 'Hello world' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
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
    expect(screen.getByText('Technology')).toHaveClass('border-cat-ai');
  });

  it('renders an unknown category with the fallback style', () => {
    renderCard({ ...post, category: 'Something New', categorySlug: 'something-new' });
    expect(screen.getByText('Something New')).toHaveClass('border-slate-500');
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'uses the fallback style for a category named "%s"',
    (name) => {
      renderCard({ ...post, category: name, categorySlug: name });
      expect(screen.getByText(name)).toHaveClass('border-slate-500');
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
    expect(screen.getByRole('button', { name: 'Downvote' })).toHaveClass('text-red-400');
    expect(screen.getByRole('button', { name: 'Upvote' })).not.toHaveClass('text-blue-400');
  });

  it('does not move the score by itself when the vote is not saved', async () => {
    renderCard({ ...post, votes: 10 });
    // Not signed in here, so the click only navigates (covered in the feed tests).
    await userEvent.setup().click(screen.getByRole('button', { name: 'Upvote' }));
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('disables comments, share and save with an explanation', () => {
    renderCard(post);
    for (const name of ['3 Comments', 'Share', 'Save']) {
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
