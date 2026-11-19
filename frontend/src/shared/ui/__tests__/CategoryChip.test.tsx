import { render, screen } from '@testing-library/react';
import CategoryChip from '@/shared/ui/CategoryChip';

describe('CategoryChip', () => {
  it('is a coloured label by default', () => {
    render(<CategoryChip name="Gaming" slug="gaming" />);

    const chip = screen.getByText('Gaming');
    expect(chip.tagName).toBe('SPAN');
    expect(chip).toHaveClass('border-cat-gaming/40', 'bg-cat-gaming/10', 'text-cat-gaming');
  });

  it('takes the colour from the slug, whatever the category is called', () => {
    render(<CategoryChip name="Technology" slug="ai" />);

    expect(screen.getByText('Technology')).toHaveClass('border-cat-ai/40');
  });

  it('uses a neutral colour for a category that is not a known topic', () => {
    render(<CategoryChip name="Chess club" slug="chess" />);

    expect(screen.getByText('Chess club')).toHaveClass('border-line-strong');
  });

  it('is a link, looking the same, when it has an address', () => {
    render(<CategoryChip name="Gaming" slug="gaming" href="/forum?topic=Gaming" />);

    const chip = screen.getByRole('link', { name: 'Gaming' });
    expect(chip).toHaveAttribute('href', '/forum?topic=Gaming');
    expect(chip).toHaveClass('border-cat-gaming/40');
  });
});
