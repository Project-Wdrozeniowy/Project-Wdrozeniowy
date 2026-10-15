import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { CreatePostDialog } from '../CreatePostDialog';
import { categoryService, postService } from '@/shared/api/forum/forumClient';

vi.mock('@/shared/api/forum/forumClient', () => ({
  categoryService: { list: vi.fn() },
  postService: { create: vi.fn() },
}));

beforeEach(() => {
  vi.mocked(categoryService.list).mockReset();
  vi.mocked(categoryService.list).mockResolvedValue([
    { id: 3, name: 'Gaming', slug: 'gaming', visible: true },
  ] as never);
  vi.mocked(postService.create).mockReset();
});

function setup(open = true) {
  const onClose = vi.fn();
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const ui = (isOpen: boolean) => (
    <QueryClientProvider client={queryClient}>
      <button>opener</button>
      <CreatePostDialog open={isOpen} onClose={onClose} />
    </QueryClientProvider>
  );
  const view = render(ui(open));
  return { onClose, user: userEvent.setup(), rerender: (o: boolean) => view.rerender(ui(o)) };
}

describe('CreatePostDialog', () => {
  it('renders nothing while closed', () => {
    setup(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('is a labelled modal dialog and focuses the title field', () => {
    setup();
    expect(screen.getByRole('dialog', { name: 'Create a post' })).toHaveAttribute(
      'aria-modal',
      'true'
    );
    expect(screen.getByLabelText(/^Title/)).toHaveFocus();
  });

  it('closes on Escape, on the close button and on a backdrop click', async () => {
    const { user, onClose } = setup();
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(2);
    await user.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('does not close when the panel itself is clicked', async () => {
    const { user, onClose } = setup();
    await user.click(screen.getByRole('dialog'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('keeps Tab inside the dialog', async () => {
    const { user } = setup();
    screen.getByRole('button', { name: 'Close' }).focus();
    await user.tab({ shift: true });
    // Shift+Tab from the first control wraps to the last one (the submit button is disabled, so Cancel).
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('returns focus to the opener when it closes', () => {
    const { rerender } = setup(false);
    const opener = screen.getByRole('button', { name: 'opener' });
    opener.focus();
    rerender(true);
    expect(screen.getByLabelText(/^Title/)).toHaveFocus();
    rerender(false);
    expect(opener).toHaveFocus();
  });

  it('makes no category request until it is first opened', () => {
    setup(false);
    expect(categoryService.list).not.toHaveBeenCalled();
  });

  it('keeps an unpublished draft when closed and reopened', async () => {
    const { user, rerender } = setup();
    await user.type(screen.getByLabelText(/^Title/), 'Draft title');
    rerender(false);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(true);
    expect(screen.getByLabelText(/^Title/)).toHaveValue('Draft title');
  });

  it('starts from an empty form after a post was published', async () => {
    vi.mocked(postService.create).mockResolvedValue({ slug: 's' } as never);
    const { user, onClose, rerender } = setup();
    await user.type(screen.getByLabelText(/^Title/), 'T');
    await user.selectOptions(await screen.findByLabelText(/^Category/), '3');
    await user.type(screen.getByLabelText(/^Body/), 'B');
    await user.click(screen.getByRole('button', { name: 'Publish post' }));
    await screen.findByText('Post published!');

    await user.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalled();
    rerender(false);
    rerender(true);
    expect(screen.queryByText('Post published!')).not.toBeInTheDocument();
    expect(screen.getByLabelText(/^Title/)).toHaveValue('');
  });

  it('cannot be closed while a post is being published', async () => {
    vi.mocked(postService.create).mockReturnValue(new Promise(() => {}) as never);
    const { user, onClose } = setup();
    await user.type(screen.getByLabelText(/^Title/), 'T');
    await user.selectOptions(await screen.findByLabelText(/^Category/), '3');
    await user.type(screen.getByLabelText(/^Body/), 'B');
    await user.click(screen.getByRole('button', { name: 'Publish post' }));
    await screen.findByRole('button', { name: 'Publishing…' });

    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Close' }));
    await user.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does not close when a press starts on the overlay scrollbar', async () => {
    const { onClose } = setup();
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    Object.defineProperty(overlay, 'offsetWidth', { value: 1000, configurable: true });
    Object.defineProperty(overlay, 'clientWidth', { value: 985, configurable: true });
    fireEvent.mouseDown(overlay, { clientX: 995 });
    fireEvent.mouseUp(overlay, { clientX: 995 });
    fireEvent.click(overlay, { clientX: 995 });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables the close button while publishing', async () => {
    vi.mocked(postService.create).mockReturnValue(new Promise(() => {}) as never);
    const { user } = setup();
    await user.type(screen.getByLabelText(/^Title/), 'T');
    await user.selectOptions(await screen.findByLabelText(/^Category/), '3');
    await user.type(screen.getByLabelText(/^Body/), 'B');
    await user.click(screen.getByRole('button', { name: 'Publish post' }));
    await screen.findByRole('button', { name: 'Publishing…' });
    expect(screen.getByRole('button', { name: 'Close' })).toBeDisabled();
  });

  it('does not close when a press starts on the backdrop but ends inside the panel', () => {
    const { onClose } = setup();
    const overlay = screen.getByRole('dialog').parentElement as HTMLElement;
    fireEvent.mouseDown(overlay);
    fireEvent.mouseUp(screen.getByRole('dialog'));
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('pulls focus back into the dialog when a button disables itself and focus falls to the page', async () => {
    vi.mocked(postService.create).mockReturnValue(new Promise(() => {}) as never);
    const { user } = setup();
    await user.type(screen.getByLabelText(/^Title/), 'T');
    await user.selectOptions(await screen.findByLabelText(/^Category/), '3');
    await user.type(screen.getByLabelText(/^Body/), 'B');

    // Browsers move focus to <body> when the focused button becomes disabled; jsdom does not.
    const focusPanel = vi.spyOn(screen.getByRole('dialog'), 'focus');
    const realActive = Object.getOwnPropertyDescriptor(Document.prototype, 'activeElement')!;
    Object.defineProperty(document, 'activeElement', {
      get: () => document.body,
      configurable: true,
    });
    try {
      await user.click(screen.getByRole('button', { name: 'Publish post' }));
      await screen.findByRole('button', { name: 'Publishing…' });
    } finally {
      delete (document as unknown as Record<string, unknown>).activeElement;
      Object.defineProperty(Document.prototype, 'activeElement', realActive);
    }
    expect(focusPanel).toHaveBeenCalled();
  });

  it('wraps Tab and Shift+Tab when the panel itself holds the focus', async () => {
    const { user } = setup();
    const panel = screen.getByRole('dialog');
    panel.focus();
    await user.tab({ shift: true });
    expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus();

    panel.focus();
    await user.tab();
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });
});
