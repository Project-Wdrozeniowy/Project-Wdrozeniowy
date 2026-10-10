import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import PostPagination from '../PostPagination';

describe('PostPagination', () => {
  it('renders nothing for a single page or no pages', () => {
    const { container, rerender } = render(
      <PostPagination page={0} totalPages={1} onPageChange={vi.fn()} />
    );
    expect(container).toBeEmptyDOMElement();

    rerender(<PostPagination page={0} totalPages={0} onPageChange={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the 1-based position in a labelled navigation', () => {
    render(<PostPagination page={1} totalPages={5} onPageChange={vi.fn()} />);
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument();
    expect(screen.getByText('Page 2 of 5')).toBeInTheDocument();
  });

  it('asks for the neighbouring pages (0-based)', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    render(<PostPagination page={2} totalPages={5} onPageChange={onPageChange} />);

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    await user.click(screen.getByRole('button', { name: 'Next' }));

    expect(onPageChange).toHaveBeenNthCalledWith(1, 1);
    expect(onPageChange).toHaveBeenNthCalledWith(2, 3);
  });

  it('cannot go before the first or after the last page', async () => {
    const onPageChange = vi.fn();
    const user = userEvent.setup();
    const { rerender } = render(
      <PostPagination page={0} totalPages={3} onPageChange={onPageChange} />
    );

    await user.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();

    rerender(<PostPagination page={2} totalPages={3} onPageChange={onPageChange} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

    expect(onPageChange).not.toHaveBeenCalled();
  });
});
