import {
  MAX_CATEGORY_BARS,
  NO_CATEGORY_LABEL,
  OTHER_CATEGORIES_LABEL,
} from '@/pages/dashboard/config/dashboard.const';
import type { PublicActivityDto } from '@/shared/api/generated/models/publicActivityDto.dto';
import type { PublicCategoryDistributionDto } from '@/shared/api/generated/models/publicCategoryDistributionDto.dto';

/** "Mon 17" for a UTC day such as "2026-11-17". Anything that is not a day is shown as it is. */
export function dayLabel(date: string): string {
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return date;
  // Built by hand: the order of weekday and day in one formatted string differs between engines.
  const weekday = parsed.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' });
  return `${weekday} ${parsed.getUTCDate()}`;
}

export interface ActivitySeries {
  /** Every day, for the text alternative. */
  days: string[];
  /** The labels drawn under the chart: all of them for a week, every fifth for a month. */
  labels: string[];
  posts: number[];
  comments: number[];
}

export function activitySeries(activity: PublicActivityDto): ActivitySeries {
  const days = activity.days.map((day) => dayLabel(day.date));
  const step = days.length > 10 ? 5 : 1;
  return {
    days,
    labels: days.map((label, index) => (index % step === 0 ? label : '')),
    posts: activity.days.map((day) => day.posts),
    comments: activity.days.map((day) => day.comments),
  };
}

export interface CategorySeries {
  labels: string[];
  values: number[];
}

/**
 * The categories of the window with their posts, in the order the server gives them. When there
 * are more than fit, the last ones are added up as "Other", so the bars still add up to the
 * window's total and nothing is dropped silently.
 */
export function categorySeries(distribution: PublicCategoryDistributionDto): CategorySeries {
  const all = distribution.categories;
  const shown = all.length > MAX_CATEGORY_BARS ? all.slice(0, MAX_CATEGORY_BARS - 1) : all;
  const rest = all.length > MAX_CATEGORY_BARS ? all.slice(MAX_CATEGORY_BARS - 1) : [];
  const labels = shown.map((row) => row.category?.name ?? NO_CATEGORY_LABEL);
  const values = shown.map((row) => row.posts);
  if (rest.length > 0) {
    labels.push(OTHER_CATEGORIES_LABEL);
    values.push(rest.reduce((sum, row) => sum + row.posts, 0));
  }
  return { labels, values };
}

/** What a chart says, in words, for people who cannot see it: "Posts per day: Mon 17: 3, …". */
export function chartSummary(title: string, labels: string[], values: number[]): string {
  const parts = values.map((value, index) => `${labels[index] || index + 1}: ${value}`);
  return `${title}. ${parts.join(', ')}`;
}

/** True when there is nothing to draw: no data, or only zeros. */
export function isEmptySeries(values: number[]): boolean {
  return values.every((value) => value === 0);
}
