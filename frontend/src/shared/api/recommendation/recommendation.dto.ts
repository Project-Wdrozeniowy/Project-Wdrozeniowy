import type { Category } from '@/shared/api/forum/category.dto';
import type { UserSummary } from '@/shared/api/user/user.dto';

export type RecommendationReason = 'trending' | 'similar_tags' | 'same_category' | 'personalized';

export interface RecommendedPost {
  id: number;
  title: string;
  slug: string;
  excerpt: string;
  voteScore: number;
  commentCount: number;
  category: Category;
  author: UserSummary;
  tags: string[];
  reason: RecommendationReason;
  createdAt: string;
}
