import { render, screen } from '@testing-library/react';
import { useQueryClient } from '@tanstack/react-query';
import QueryProvider from '../QueryProvider';

// next/dynamic is not supported in vitest jsdom – mock it to render nothing
vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

describe('QueryProvider', () => {
  it('renders children', () => {
    render(
      <QueryProvider>
        <div data-testid="child">child content</div>
      </QueryProvider>
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('children can access QueryClient context', () => {
    function Consumer() {
      const client = useQueryClient();
      return <span data-testid="has-client">{client ? 'yes' : 'no'}</span>;
    }

    render(
      <QueryProvider>
        <Consumer />
      </QueryProvider>
    );

    expect(screen.getByTestId('has-client')).toHaveTextContent('yes');
  });

  it('renders multiple children', () => {
    render(
      <QueryProvider>
        <div data-testid="a">A</div>
        <div data-testid="b">B</div>
      </QueryProvider>
    );
    expect(screen.getByTestId('a')).toBeInTheDocument();
    expect(screen.getByTestId('b')).toBeInTheDocument();
  });
});
