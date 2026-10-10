import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostCard from '../PostCard';
import type { PostCardData } from '@/lib/postCard';

const post: PostCardData = {
  id: '1',
  href: '/forum/hello',
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
};

describe('PostCard', () => {
  it('links the title to the post page when there is an href', () => {
    render(<PostCard post={post} />);
    expect(screen.getByRole('link', { name: 'Hello world' })).toHaveAttribute(
      'href',
      '/forum/hello'
    );
  });

  it('renders the title as plain text without an href', () => {
    render(<PostCard post={{ ...post, href: undefined }} />);
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
});
