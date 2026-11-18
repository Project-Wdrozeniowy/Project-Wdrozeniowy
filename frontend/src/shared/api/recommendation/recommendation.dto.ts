import type { CategoryDto as Category } from '@/shared/api/generated/models/categoryDto.dto';
import type { UserSummaryDto as UserSummary } from '@/shared/api/generated/models/userSummaryDto.dto';

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
