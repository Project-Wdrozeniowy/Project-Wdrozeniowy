import {
  CHART_COLORS,
  NO_CATEGORY_LABEL,
  TOP_POSTS_FORMULA,
  TOP_POSTS_RULES,
  TOP_POSTS_WINDOW_HOURS,
} from '@/pages/dashboard/config/dashboard.const';
import { TOP_POSTS_LIMIT, type AnalyticsPeriod } from '@/shared/api/analytics/analytics.const';
import type { PublicActivityDto } from '@/shared/api/generated/models/publicActivityDto.dto';
import type { ActivityMetric } from '@/widgets/activity-chart';
import type { PublicCategoryDistributionDto } from '@/shared/api/generated/models/publicCategoryDistributionDto.dto';
import type { PublicCategoryShareDto } from '@/shared/api/generated/models/publicCategoryShareDto.dto';

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

export interface CategoryRow extends PublicCategoryShareDto {
  key: string;
  label: string;
  barPercent: number;
}

/**
 * Every API row, including zero and uncategorized, in server order. Identity and shares stay
 * intact for the table and PWDRZ-185. Only the bar length is derived, relative to the largest count.
 */
export function categorySeries(distribution: PublicCategoryDistributionDto): CategoryRow[] {
  const max = distribution.categories.reduce((largest, row) => Math.max(largest, row.posts), 0);
  return distribution.categories.map((row) => ({
    ...row,
    key: row.category === null ? 'uncategorized' : `category-${row.category.id}`,
    label: row.category?.name ?? NO_CATEGORY_LABEL,
    barPercent: max === 0 ? 0 : (row.posts / max) * 100,
  }));
}

/** "1 post", "31 posts": the figure with its noun, grouped as the rest of the dashboard does. */
export function countLabel(count: number, one: string, other: string): string {
  return `${count.toLocaleString('en-US')} ${count === 1 ? one : other}`;
}

/** What the top posts are ranked by, and over which span, in the contract's words. */
export function topPostsSummary(period: AnalyticsPeriod): string {
  const hours = TOP_POSTS_WINDOW_HOURS[period];
  return `Ranked by ${TOP_POSTS_FORMULA}, counted over the ${hours / 24} days (${hours} hours) before now.`;
}

/** The rules of the ranking, with the size of the list taken from what the card asks for. */
export function topPostsRules(): string[] {
  return TOP_POSTS_RULES.map((rule) => rule.replace('{limit}', String(TOP_POSTS_LIMIT)));
}
