import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostCard from '../PostCard';
import { ACTION_UNAVAILABLE_HINT, VOTING_UNAVAILABLE_HINT } from '@/app/(main)/_ui/postCard.const';
import type { PostCardData } from '@/app/(main)/forum/_lib/postCard';

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
  actionsEnabled: true,
};

describe('PostCard', () => {
  it('renders the title as a heading, not a link', () => {
    render(<PostCard post={post} />);
    expect(screen.getByRole('heading', { name: 'Hello world' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('renders no excerpt paragraph when the API provides none', () => {
    const { container } = render(<PostCard post={post} />);
    expect(container.querySelector('p')).toBeNull();
  });

  it('renders the excerpt when present', () => {
    render(<PostCard post={{ ...post, excerpt: 'A short preview' }} />);
    expect(screen.getByText('A short preview')).toBeInTheDocument();
  });

  it('omits the category chip when the post has no category', () => {
    render(<PostCard post={{ ...post, category: null }} />);
    expect(screen.queryByText('Gaming')).not.toBeInTheDocument();
  });

  it('colors the chip by category slug even when the name differs from our topic labels', () => {
    render(<PostCard post={{ ...post, category: 'Technology', categorySlug: 'ai' }} />);
    expect(screen.getByText('Technology')).toHaveClass('border-cat-ai');
  });

  it('renders an unknown category with the fallback style', () => {
    render(
      <PostCard post={{ ...post, category: 'Something New', categorySlug: 'something-new' }} />
    );
    expect(screen.getByText('Something New')).toHaveClass('border-slate-500');
  });

  it('shows counts and the author', () => {
    render(<PostCard post={{ ...post, votes: 1500, badge: 'pinned' }} />);
    expect(screen.getByText('1.5k')).toBeInTheDocument();
    expect(screen.getByText('3 Comments')).toBeInTheDocument();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('pinned')).toBeInTheDocument();
  });

  it('follows the vote count of the post when fresh data arrives', () => {
    const { rerender } = render(<PostCard post={{ ...post, votes: 12 }} />);
    expect(screen.getByText('12')).toBeInTheDocument();

    rerender(<PostCard post={{ ...post, votes: 20 }} />);
    expect(screen.getByText('20')).toBeInTheDocument();
  });

  it('applies the local vote on top of the current count', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<PostCard post={{ ...post, votes: 10 }} />);

    await user.click(screen.getAllByRole('button')[0]);
    expect(screen.getByText('11')).toBeInTheDocument();

    rerender(<PostCard post={{ ...post, votes: 20 }} />);
    expect(screen.getByText('21')).toBeInTheDocument();
  });

  it('toggles and switches the vote', async () => {
    const user = userEvent.setup();
    render(<PostCard post={{ ...post, votes: 10 }} />);
    const [up, down] = screen.getAllByRole('button');

    await user.click(up);
    expect(screen.getByText('11')).toBeInTheDocument();
    await user.click(up);
    expect(screen.getByText('10')).toBeInTheDocument();
    await user.click(up);
    await user.click(down);
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it.each(['constructor', 'toString', '__proto__'])(
    'uses the fallback style for a category named "%s"',
    (name) => {
      render(<PostCard post={{ ...post, category: name, categorySlug: name }} />);
      expect(screen.getByText(name)).toHaveClass('border-slate-500');
    }
  );

  describe('when actions are not available (real posts)', () => {
    const real = { ...post, actionsEnabled: false, votes: 10 };

    it('disables both vote buttons with an explanation, but keeps them visible', () => {
      render(<PostCard post={real} />);
      for (const name of ['Upvote', 'Downvote']) {
        const button = screen.getByRole('button', { name });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('title', VOTING_UNAVAILABLE_HINT);
      }
    });

    it('never changes the score, so nothing looks like a saved vote', async () => {
      render(<PostCard post={real} />);
      const user = userEvent.setup();

      await user.click(screen.getByRole('button', { name: 'Upvote' }));
      await user.click(screen.getByRole('button', { name: 'Downvote' }));

      expect(screen.getByText('10')).toBeInTheDocument();
    });

    it('disables comments, share and save with an explanation', () => {
      render(<PostCard post={real} />);
      for (const name of ['3 Comments', 'Share', 'Save']) {
        const button = screen.getByRole('button', { name });
        expect(button).toBeDisabled();
        expect(button).toHaveAttribute('title', ACTION_UNAVAILABLE_HINT);
      }
    });
  });

  describe('when actions are available (fixtures)', () => {
    it('enables the buttons without a tooltip', () => {
      render(<PostCard post={post} />);
      for (const name of ['Upvote', 'Downvote', 'Share', 'Save']) {
        const button = screen.getByRole('button', { name });
        expect(button).toBeEnabled();
        expect(button).not.toHaveAttribute('title');
      }
    });
  });
});
