import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import ForumFeed from '../ForumFeed';
import { MOCK_POSTS } from '@/constants/posts';

const mockReplace = vi.fn();
let search = '';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  usePathname: () => '/forum',
  useSearchParams: () => new URLSearchParams(search),
}));

vi.mock('@/hooks/usePosts', () => ({
  usePosts: () => ({ data: MOCK_POSTS, isLoading: false }),
}));

vi.mock('@/app/_components/PostCard', () => ({
  default: ({ post }: { post: { id: string | number; category: string } }) => (
    <div data-testid="post">{post.category}</div>
  ),
}));

beforeEach(() => {
  mockReplace.mockClear();
  search = '';
});

describe('ForumFeed', () => {
  it('shows all posts without a topic', () => {
    render(<ForumFeed />);
    expect(screen.getAllByTestId('post')).toHaveLength(MOCK_POSTS.length);
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('filters by the topic query parameter', () => {
    search = 'topic=Gaming';
    render(<ForumFeed />);
    const posts = screen.getAllByTestId('post');
    expect(posts.length).toBeGreaterThan(0);
    posts.forEach((post) => expect(post).toHaveTextContent('Gaming'));
    expect(screen.getByRole('button', { name: 'Gaming' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('ignores an unknown topic', () => {
    search = 'topic=Nonsense';
    render(<ForumFeed />);
    expect(screen.getAllByTestId('post')).toHaveLength(MOCK_POSTS.length);
  });

  it('writes the selected topic to the URL', async () => {
    render(<ForumFeed />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'Science' }));
    expect(mockReplace).toHaveBeenCalledWith('/forum?topic=Science', { scroll: false });
  });

  it('removes the parameter when All is selected', async () => {
    search = 'topic=Science&page=2';
    render(<ForumFeed />);
    await userEvent.setup().click(screen.getByRole('button', { name: 'All' }));
    expect(mockReplace).toHaveBeenCalledWith('/forum?page=2', { scroll: false });
  });
});
