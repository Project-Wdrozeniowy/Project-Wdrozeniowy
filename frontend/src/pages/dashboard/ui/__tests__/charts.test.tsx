import { render, screen } from '@testing-library/react';
import BarChart from '@/pages/dashboard/ui/BarChart';

describe('BarChart', () => {
  it('is an image with the summary as its text alternative', () => {
    render(<BarChart data={[4, 2]} labels={['AI', 'Gaming']} summary="Posts by category" />);

    expect(screen.getByRole('img', { name: 'Posts by category' })).toBeInTheDocument();
    expect(screen.getByText('Gaming')).toBeInTheDocument();
  });

  it('shortens a long label', () => {
    render(<BarChart data={[1]} labels={['A very long category']} summary="s" />);

    expect(screen.getByText('A very …')).toBeInTheDocument();
  });

  it('never produces NaN when every value is zero', () => {
    const { container } = render(<BarChart data={[0, 0]} labels={['a', 'b']} summary="s" />);

    expect(container.innerHTML).not.toContain('NaN');
  });

  it('works without labels and without data', () => {
    const { container } = render(<BarChart data={[]} summary="s" />);

    expect(container.querySelectorAll('rect')).toHaveLength(0);
  });

  it('gives every bar its full name and value as a tooltip', () => {
    const { container } = render(
      <BarChart data={[4, 2]} labels={['Technology', 'Technical Support']} summary="s" />
    );

    const titles = [...container.querySelectorAll('title')].map((node) => node.textContent);
    expect(titles).toEqual(['Technology: 4', 'Technical Support: 2']);
  });
});
