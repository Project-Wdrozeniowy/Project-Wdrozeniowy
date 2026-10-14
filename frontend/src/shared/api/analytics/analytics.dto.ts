export interface UserActivitySummary {
  userId: number;
  username: string;
  totalPosts: number;
  totalComments: number;
  totalVotesCast: number;
  totalUpvotesReceived: number;
  totalDownvotesReceived: number;
  lastActivityAt: string | null;
}

export interface PostAnalytics {
  postId: number;
  postTitle: string;
  viewCount: number;
  uniqueViewCount: number;
  commentCount: number;
  voteScore: number;
  upvoteCount: number;
  downvoteCount: number;
  subscriptionCount: number;
}

export interface PlatformSummary {
  totalUsers: number;
  activeUsers: number;
  totalPosts: number;
  totalComments: number;
  totalVotes: number;
  totalCategories: number;
  totalTags: number;
}

export interface TrendDataPoint {
  date: string; // ISO date string, e.g. "2026-05-07"
  count: number;
}

export type TrendMetric = 'posts' | 'comments' | 'votes' | 'users';
export type TrendPeriod = '24h' | '7d' | '30d' | '90d';

export interface ActivityTrend {
  metric: TrendMetric;
  period: TrendPeriod;
  total: number;
  data: TrendDataPoint[];
}
