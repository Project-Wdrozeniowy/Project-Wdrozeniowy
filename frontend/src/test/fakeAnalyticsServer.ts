import type MockAdapter from 'axios-mock-adapter';
import type { PostSummaryDto } from '@/shared/api/generated/models/postSummaryDto.dto';
import type { PublicActivityComparisonDto } from '@/shared/api/generated/models/publicActivityComparisonDto.dto';
import type { PublicActivityDto } from '@/shared/api/generated/models/publicActivityDto.dto';
import type { PublicCategoryDistributionDto } from '@/shared/api/generated/models/publicCategoryDistributionDto.dto';
import type { UserActivitySummaryDto } from '@/shared/api/generated/models/userActivitySummaryDto.dto';

type Period = '7d' | '30d';

/** The public analytics endpoints, behind the real ApiClient, answering as the contract documents. */
export interface AnalyticsData {
  comparison: (period: Period) => PublicActivityComparisonDto;
  activity: (period: Period) => PublicActivityDto;
  categories: (period: Period) => PublicCategoryDistributionDto;
  trending: (period: Period) => PostSummaryDto[];
  me: UserActivitySummaryDto;
}

const GENERATED_AT = '2026-11-18T10:00:00Z';
const windowStart = (period: Period) =>
  period === '7d' ? '2026-11-12T00:00:00Z' : '2026-10-20T00:00:00Z';

export function makeComparison(posts: number, comments: number, period: Period = '7d') {
  return {
    period,
    generatedAt: GENERATED_AT,
    posts: {
      current: posts,
      previous: 40,
      change: posts - 40,
      changePercent: ((posts - 40) / 40) * 100,
    },
    comments: { current: comments, previous: 0, change: comments, changePercent: null },
    current: { posts, comments, start: windowStart(period), end: GENERATED_AT },
    previous: {
      posts: 40,
      comments: 0,
      end: windowStart(period),
      start: new Date(2 * Date.parse(windowStart(period)) - Date.parse(GENERATED_AT)).toISOString(),
    },
  } satisfies PublicActivityComparisonDto;
}

export function makeActivity(days: Array<[string, number, number]>, period: Period = '7d') {
  return {
    period,
    generatedAt: '2026-11-18T10:00:00Z',
    windowStart: windowStart(period),
    windowEnd: '2026-11-19T00:00:00Z',
    totalPosts: days.reduce((sum, day) => sum + day[1], 0),
    totalComments: days.reduce((sum, day) => sum + day[2], 0),
    days: days.map(([date, posts, comments]) => ({ date, posts, comments })),
  } as PublicActivityDto;
}

export function makeCategories(
  rows: Array<[string | null, number, string?]>,
  period: Period = '7d'
): PublicCategoryDistributionDto {
  const allRows: typeof rows = rows.some(([name]) => name === null) ? rows : [...rows, [null, 0]];
  const totalPosts = allRows.reduce((sum, row) => sum + row[1], 0);
  return {
    period,
    generatedAt: '2026-11-18T10:00:00Z',
    windowStart: windowStart(period),
    windowEnd: '2026-11-19T00:00:00Z',
    totalPosts,
    categories: allRows.map(([name, posts, slug], index) => ({
      posts,
      share: totalPosts === 0 ? null : Math.round((posts / totalPosts) * 10_000) / 10_000,
      category: name
        ? {
            id: index + 1,
            name,
            slug: slug ?? name.toLowerCase().replace(/\W+/g, '-'),
            visible: true,
          }
        : null,
    })),
  } satisfies PublicCategoryDistributionDto;
}

export function makePost(id: number, title: string, overrides: Partial<PostSummaryDto> = {}) {
  return {
    id,
    slug: `post-${id}`,
    title,
    author: { id: 1, username: 'alice', displayName: null, avatarUrl: null, role: 'USER' },
    category: null,
    commentCount: 3,
    createdAt: '2026-11-17T10:00:00Z',
    lastActivityAt: '2026-11-18T10:00:00Z',
    myVote: null,
    pinned: false,
    status: 'PUBLISHED',
    tags: [],
    viewCount: 120,
    voteScore: 7,
    ...overrides,
  } as PostSummaryDto;
}

export const DEFAULT_ANALYTICS: AnalyticsData = {
  comparison: (period) =>
    period === '7d' ? makeComparison(60, 100, period) : makeComparison(210, 400, period),
  activity: (period) =>
    makeActivity(
      period === '7d'
        ? [
            ['2026-11-16', 20, 50],
            ['2026-11-17', 30, 30],
            ['2026-11-18', 10, 20],
          ]
        : [
            ['2026-10-20', 80, 100],
            ['2026-11-18', 130, 300],
          ],
      period
    ),
  categories: (period) =>
    makeCategories(
      period === '7d'
        ? [
            ['AI / Tech', 35, 'ai'],
            ['Gaming', 20],
            [null, 5],
          ]
        : [
            ['Science', 90],
            ['Gaming', 120],
          ],
      period
    ),
  trending: (period) => [
    makePost(1, period === '7d' ? 'Hot this week' : 'Hot this month', {
      voteScore: 42,
      commentCount: 12,
      viewCount: 1200,
    }),
    makePost(2, 'Second best'),
  ],
  me: {
    userId: 1,
    username: 'alice',
    totalPosts: 12,
    totalComments: 48,
    totalUpvotesReceived: 300,
    totalDownvotesReceived: 2,
    totalVotesCast: 80,
    lastActivityAt: null,
  },
};

const periodOf = (config: { params?: { period?: string } }): Period =>
  config.params?.period === '30d' ? '30d' : '7d';

/** Registers the endpoints; pass changes to answer differently (a test may also register its own first). */
export function fakeAnalyticsServer(mock: MockAdapter, data: Partial<AnalyticsData> = {}) {
  const d = { ...DEFAULT_ANALYTICS, ...data };
  mock.onGet('/analytics/public/comparison').reply((c) => [200, d.comparison(periodOf(c))]);
  mock.onGet('/analytics/public/activity').reply((c) => [200, d.activity(periodOf(c))]);
  mock.onGet('/analytics/public/categories').reply((c) => [200, d.categories(periodOf(c))]);
  mock.onGet('/analytics/trending-posts').reply((c) => [200, d.trending(periodOf(c))]);
  mock.onGet('/analytics/me').reply(200, d.me);
}

export const requestsTo = (mock: MockAdapter, url: string) =>
  mock.history.get.filter((request) => request.url === url);
