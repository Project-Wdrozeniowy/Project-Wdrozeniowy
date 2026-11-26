import type { PostOpeningTrendDto } from '@/shared/api/generated/models/postOpeningTrendDto.dto';

export function compactWindow(trend: PostOpeningTrendDto) {
  const days = trend.days.slice(-7);
  return {
    days,
    total: days.reduce((total, day) => total + (day.measured ? (day.openings ?? 0) : 0), 0),
  };
}

export function insightsAxis(max: number) {
  const raw = Math.max(1, max / 4);
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const increment = magnitude >= 10 ? magnitude / 2 : 1;
  const step = Math.ceil(raw / increment) * increment;
  return { top: step * 4, ticks: [0, step, step * 2, step * 3, step * 4] };
}
