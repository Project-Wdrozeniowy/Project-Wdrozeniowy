import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import QueryState from '@/shared/ui/QueryState';

const ready = { isPending: false, isLoadingError: false, isFetching: false, refetch: vi.fn() };

function renderState(query = ready, extra: { empty?: boolean; emptyText?: string } = {}) {
  return render(
    <QueryState query={query} errorText="Fixed failure text" skeleton={<p>skeleton</p>} {...extra}>
      <p>the data</p>
    </QueryState>
  );
}

beforeEach(() => vi.clearAllMocks());

describe('QueryState', () => {
  it('shows the skeleton while loading', () => {
    renderState({ ...ready, isPending: true });

    expect(screen.getByText('skeleton')).toBeInTheDocument();
    expect(screen.queryByText('the data')).not.toBeInTheDocument();
  });

  it('shows the data', () => {
    renderState();

    expect(screen.getByText('the data')).toBeInTheDocument();
  });

  it('shows the empty text instead of the data when there is nothing', () => {
    renderState(ready, { empty: true, emptyText: 'Nothing yet.' });

    expect(screen.getByText('Nothing yet.')).toBeInTheDocument();
    expect(screen.queryByText('the data')).not.toBeInTheDocument();
  });

  it('shows a fixed message and a retry when it failed before any data', async () => {
    const refetch = vi.fn();
    renderState({ ...ready, isLoadingError: true, refetch });

    expect(screen.getByRole('alert')).toHaveTextContent('Fixed failure text');
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));

    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it('says the shared fixed message when no text is given', () => {
    render(
      <QueryState query={{ ...ready, isLoadingError: true }} skeleton={<p>skeleton</p>}>
        <p>the data</p>
      </QueryState>
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not load this. Please try again.'
    );
  });

  it('ignores a retry while one is running', async () => {
    const refetch = vi.fn();
    renderState({ ...ready, isLoadingError: true, isFetching: true, refetch });

    const button = screen.getByRole('button', { name: 'Trying…' });
    await userEvent.click(button);

    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(refetch).not.toHaveBeenCalled();
  });
});
