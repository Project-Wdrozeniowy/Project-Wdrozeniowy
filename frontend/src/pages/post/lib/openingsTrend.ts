import { collectionDate, dayRange, utcDay, utcTime } from '@/pages/post/lib/postInsights';
import type { PostOpeningTrendDto } from '@/shared/api/generated/models/postOpeningTrendDto.dto';
import type { ActivityMetric } from '@/widgets/activity-chart';

/**
 * The author's openings as the chart takes them. A day before collection began is `null`, not
 * `0`: the API says `measured: false` for it, and a measured day without openings is a real `0`.
 * The day of `generatedAt` is the current one and still counts up, so it is marked partial.
 */
export function openingsMetric(trend: PostOpeningTrendDto | undefined): ActivityMetric {
  const today = trend ? utcDay(trend.generatedAt) : undefined;
  return {
    id: 'openings',
    name: 'Openings',
    unit: { one: 'opening', other: 'openings' },
    points: (trend?.days ?? []).map((day) => ({
      date: day.date,
      value: day.measured ? day.openings : null,
      partial: day.date === today,
    })),
  };
}

/** "Mar 2–8, 2026 · UTC · daily openings. Today is partial, counted up to 14:30 UTC." */
export function trendDescription(trend: PostOpeningTrendDto): string {
  const first = trend.days[0]?.date;
  const last = trend.days.at(-1)?.date;
  const range = first && last ? `${dayRange(first, last)} · ` : '';
  const partial = trend.days.some((day) => day.date === utcDay(trend.generatedAt))
    ? ` Today is partial, counted up to ${utcTime(trend.generatedAt)} UTC.`
    : '';
  return `${range}UTC · daily openings.${partial}`;
}

/** Why a day has no value, and that it is not a zero. */
export function missingDaysNote(trend: PostOpeningTrendDto): string {
  return `Openings were not collected before ${collectionDate(trend.collectedFrom)} UTC. Those days are not zero.`;
}
