import {
  CHART_COLORS,
  MAX_CATEGORY_BARS,
  NO_CATEGORY_LABEL,
  OTHER_CATEGORIES_LABEL,
} from '@/pages/dashboard/config/dashboard.const';
import type { PublicActivityDto } from '@/shared/api/generated/models/publicActivityDto.dto';
import type { ActivityMetric } from '@/widgets/activity-chart';
import type { PublicCategoryDistributionDto } from '@/shared/api/generated/models/publicCategoryDistributionDto.dto';

/** What the activity chart can count: public posts and comments per UTC day, as the API gives them. */
export function activityMetrics(activity: PublicActivityDto | undefined): ActivityMetric[] {
  const days = activity?.days ?? [];
  return [
    {
      id: 'posts',
      name: 'Posts',
      unit: { one: 'post', other: 'posts' },
      color: CHART_COLORS.posts,
      points: days.map((day) => ({ date: day.date, value: day.posts })),
    },
    {
      id: 'comments',
      name: 'Comments',
      unit: { one: 'comment', other: 'comments' },
      color: CHART_COLORS.comments,
      points: days.map((day) => ({ date: day.date, value: day.comments })),
    },
  ];
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
