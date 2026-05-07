import { CategoryKey } from '@/shared/types';

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  color: string;
}

export const CATEGORIES: CategoryMeta[] = [
  { key: CategoryKey.AI, label: 'AI / Tech', color: 'bg-blue-500' },
  { key: CategoryKey.GAMING, label: 'Gaming', color: 'bg-green-500' },
  { key: CategoryKey.POLITICS, label: 'Politics', color: 'bg-red-500' },
  { key: CategoryKey.SCIENCE, label: 'Science', color: 'bg-violet-500' },
  { key: CategoryKey.BUSINESS, label: 'Business', color: 'bg-amber-500' },
  { key: CategoryKey.EDUCATION, label: 'Education', color: 'bg-teal-500' },
  { key: CategoryKey.NEWS, label: 'News', color: 'bg-gray-500' },
];

export const CATEGORY_COLOR: Record<CategoryKey, string> = Object.fromEntries(
  CATEGORIES.map(({ key, color }) => [key, color])
) as Record<CategoryKey, string>;
