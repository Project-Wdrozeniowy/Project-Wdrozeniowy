import { render, screen } from '@testing-library/react';
import BarChart from '@/pages/dashboard/ui/BarChart';
import LineChart from '@/pages/dashboard/ui/LineChart';

describe('LineChart', () => {
  it('is an image with the summary as its text alternative', () => {
    render(<LineChart data={[1, 3, 2]} labels={['a', 'b', 'c']} summary="Posts per day. a: 1" />);

    expect(screen.getByRole('img', { name: 'Posts per day. a: 1' })).toBeInTheDocument();
  });

  it('draws a point per value and skips empty labels', () => {
    const { container } = render(
      <LineChart data={[1, 3, 2]} labels={['a', '', 'c']} summary="s" />
    );

    expect(container.querySelectorAll('circle')).toHaveLength(3);
    expect(screen.getByText('a')).toBeInTheDocument();
    expect(screen.getByText('c')).toBeInTheDocument();
    expect(container.querySelectorAll('text')).toHaveLength(2 + 2);
  });

  it('never produces NaN, for one point or for zeros', () => {
    const one = render(<LineChart data={[4]} summary="s" />);
    expect(one.container.innerHTML).not.toContain('NaN');
    one.unmount();

    const zeros = render(<LineChart data={[0, 0, 0]} summary="s" />);
    expect(zeros.container.innerHTML).not.toContain('NaN');
  });

  it('draws nothing for no data, without failing', () => {
    const { container } = render(<LineChart data={[]} summary="s" />);

    expect(container.querySelectorAll('circle')).toHaveLength(0);
    expect(container.innerHTML).not.toContain('NaN');
  });
});

describe('LineChart gradients', () => {
  it('gives two charts of the same colour different gradient ids', () => {
    const { container } = render(
      <>
        <LineChart data={[1, 2]} color="#2563eb" summary="one" />
        <LineChart data={[3, 4]} color="#2563eb" summary="two" />
      </>
    );

    const ids = [...container.querySelectorAll('linearGradient')].map((node) => node.id);
    expect(ids).toHaveLength(2);
    expect(new Set(ids).size).toBe(2);
    for (const id of ids) {
      expect(container.querySelector(`path[fill="url(#${id})"]`)).not.toBeNull();
    }
  });
});

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
