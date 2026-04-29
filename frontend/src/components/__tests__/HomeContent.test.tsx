import { render, screen } from '@testing-library/react';
import HomeContent from '../HomeContent';

describe('HomeContent', () => {
  it('renders without crashing', () => {
    render(<HomeContent />);
  });

  it('displays the main heading', () => {
    render(<HomeContent />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Welcome to Your Next.js App'
    );
  });

  it('displays the subtitle paragraph', () => {
    render(<HomeContent />);
    expect(screen.getByText(/Your project is configured with TypeScript/i)).toBeInTheDocument();
  });

  it('renders inside a <main> element', () => {
    render(<HomeContent />);
    expect(screen.getByRole('main')).toBeInTheDocument();
  });
});
