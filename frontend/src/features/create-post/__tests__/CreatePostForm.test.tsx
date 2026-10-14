import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError } from 'axios';
import { vi } from 'vitest';
import { CreatePostForm } from '../CreatePostForm';
import { categoryService, postService } from '@/shared/api/forum/forumClient';

vi.mock('@/shared/api/forum/forumClient', () => ({
  categoryService: { list: vi.fn() },
  postService: { create: vi.fn() },
}));

const categories = [
  { id: 1, name: 'AI / Tech', slug: 'ai', visible: true },
  { id: 2, name: 'Hidden', slug: 'hidden', visible: false },
  { id: 3, name: 'Gaming', slug: 'gaming', visible: true },
];

function httpError(status: number, data?: unknown) {
  return new AxiosError('failed', 'ERR', undefined, undefined, { status, data } as never);
}

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onCancel = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <CreatePostForm onCancel={onCancel} />
    </QueryClientProvider>
  );
  return { user: userEvent.setup(), onCancel, queryClient };
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Title/), '  My post ');
  await user.selectOptions(await screen.findByLabelText(/^Category/), '3');
  await user.type(screen.getByLabelText(/^Body/), 'Hello');
}

beforeEach(() => {
  vi.mocked(categoryService.list).mockResolvedValue(categories as never);
  vi.mocked(postService.create).mockReset();
});

describe('CreatePostForm', () => {
  it('starts empty with publish disabled and lists only visible categories', async () => {
    setup();
    expect(screen.getByRole('button', { name: 'Publish post' })).toBeDisabled();
    await screen.findByRole('option', { name: 'Gaming' });
    expect(screen.queryByRole('option', { name: 'Hidden' })).not.toBeInTheDocument();
  });

  it('shows the required errors after leaving empty fields', async () => {
    const { user } = setup();
    await user.click(screen.getByLabelText(/^Title/));
    await user.tab();
    expect(await screen.findByText('Title is required')).toBeInTheDocument();
    expect(screen.getByLabelText(/^Title/)).toHaveAttribute('aria-invalid', 'true');
  });

  it('counts characters', async () => {
    const { user } = setup();
    await user.type(screen.getByLabelText(/^Title/), 'abc');
    expect(screen.getByText('3/120')).toBeInTheDocument();
  });

  it('publishes the trimmed values, resets the form and offers the post link', async () => {
    vi.mocked(postService.create).mockResolvedValue({ slug: 'my-post' } as never);
    const { user, queryClient } = setup();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    await fillValid(user);
    const tagInput = screen.getByLabelText('Tags');
    await user.type(tagInput, '#React,Next{Enter}');
    await user.click(screen.getByRole('button', { name: 'Publish post' }));

    await waitFor(() =>
      expect(postService.create).toHaveBeenCalledWith(
        { title: 'My post', content: 'Hello', categoryId: 3, tags: ['react', 'next'] },
        { skipErrorToast: true }
      )
    );
    expect(await screen.findByText('Post published!')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View post/ })).toHaveAttribute(
      'href',
      '/forum/my-post'
    );
    expect(screen.getByLabelText(/^Title/)).toHaveValue('');
    expect(screen.queryByText('#react')).not.toBeInTheDocument();
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['forum-posts'] });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['posts'] });
  });

  it('shows Publishing… and blocks a second submit while the request is pending', async () => {
    let resolve: (value: unknown) => void = () => {};
    vi.mocked(postService.create).mockReturnValue(new Promise((r) => (resolve = r)) as never);
    const { user } = setup();
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Publish post' }));

    const busy = await screen.findByRole('button', { name: 'Publishing…' });
    expect(busy).toBeDisabled();
    await user.type(screen.getByLabelText(/^Body/), 'x');
    expect(postService.create).toHaveBeenCalledTimes(1);
    resolve({ slug: 's' });
  });

  it('keeps the input and shows a form error when publishing fails', async () => {
    vi.mocked(postService.create).mockRejectedValue(httpError(500));
    const { user } = setup();
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Publish post' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('We could not publish your post');
    expect(screen.getByLabelText(/^Title/)).toHaveValue('  My post ');
    expect(screen.queryByText('Post published!')).not.toBeInTheDocument();
  });

  it('puts a 404 on the category field', async () => {
    vi.mocked(postService.create).mockRejectedValue(httpError(404));
    const { user } = setup();
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: 'Publish post' }));
    expect(await screen.findByText(/no longer exists/)).toBeInTheDocument();
  });

  it('shows a message and a retry when categories cannot be loaded', async () => {
    vi.mocked(categoryService.list).mockRejectedValueOnce(httpError(501));
    const { user } = setup();
    expect(await screen.findByText(/could not load the categories/)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Category/)).toBeDisabled();

    vi.mocked(categoryService.list).mockResolvedValue(categories as never);
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    expect(await screen.findByRole('option', { name: 'Gaming' })).toBeInTheDocument();
  });

  it('shows a message when there are no categories', async () => {
    vi.mocked(categoryService.list).mockResolvedValue([] as never);
    setup();
    expect(await screen.findByText('No categories are available yet.')).toBeInTheDocument();
  });

  it('does not submit when Enter is pressed in the tag field', async () => {
    const { user } = setup();
    await fillValid(user);
    await user.type(screen.getByLabelText('Tags'), 'a{Enter}');
    expect(postService.create).not.toHaveBeenCalled();
  });

  it('calls onCancel', async () => {
    const { user, onCancel } = setup();
    await user.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onCancel).toHaveBeenCalled();
  });
});
