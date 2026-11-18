import { formatChange } from '@/shared/lib/formatChange';

describe('formatChange', () => {
  it.each([
    [12.5, '+12.5%', 'up'],
    [-3.1, '-3.1%', 'down'],
    [0, '0%', 'flat'],
    [0.04, '0%', 'flat'],
    [50, '+50%', 'up'],
    [-100, '-100%', 'down'],
  ])('shows %s as %s', (percent, text, tone) => {
    expect(formatChange(percent)).toEqual({ text, tone });
  });

  it.each([[null], [undefined], [Number.NaN]])('has nothing to show for %s', (percent) => {
    expect(formatChange(percent)).toEqual({ text: '', tone: 'none' });
  });
});
