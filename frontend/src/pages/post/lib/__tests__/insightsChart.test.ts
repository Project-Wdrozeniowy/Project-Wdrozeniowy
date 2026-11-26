import { compactWindow, insightsAxis } from '@/pages/post/lib/insightsChart';
import type { PostOpeningTrendDto } from '@/shared/api/generated/models/postOpeningTrendDto.dto';

it('uses only the most recent seven UTC rows and never adds unmeasured values', () => {
  const days = Array.from({ length: 30 }, (_, i) => ({
    date: `2026-11-${String(i + 1).padStart(2, '0')}`,
    measured: i !== 29,
    openings: i === 29 ? null : 2,
  }));
  const window = compactWindow({ days, totalOpenings: 58 } as PostOpeningTrendDto);
  expect(window.days).toEqual(days.slice(-7));
  expect(window.total).toBe(12);
});

it.each([
  [42, 60, 15],
  [21, 24, 6],
  [0, 4, 1],
])('scales %i to the design tick layout', (max, top, step) => {
  expect(insightsAxis(max)).toEqual({ top, ticks: [0, step, step * 2, step * 3, top] });
});
