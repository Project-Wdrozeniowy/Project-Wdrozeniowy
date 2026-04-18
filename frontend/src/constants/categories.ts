import { CategoryKey } from '@/shared/types';

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  color: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: CategoryKey.AI, label: 'AI / Tech', color: 'bg-cat-ai' },
  { key: CategoryKey.GAMING, label: 'Gaming', color: 'bg-cat-gaming' },
  { key: CategoryKey.POLITICS, label: 'Politics', color: 'bg-cat-politics' },
  { key: CategoryKey.SCIENCE, label: 'Science', color: 'bg-cat-science' },
  { key: CategoryKey.BUSINESS, label: 'Business', color: 'bg-cat-business' },
  { key: CategoryKey.EDUCATION, label: 'Education', color: 'bg-cat-education' },
  { key: CategoryKey.NEWS, label: 'News', color: 'bg-cat-news' },
];

export const CATEGORY_COLOR: Record<CategoryKey, string> = Object.fromEntries(
  CATEGORIES.map(({ key, color }) => [key, color])
) as Record<CategoryKey, string>;
