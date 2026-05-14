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

// Display-name enum used by mock post data and forum components
export enum Topic {
  AI = 'AI / Tech',
  Gaming = 'Gaming',
  Politics = 'Politics',
  Science = 'Science',
  Business = 'Business',
  Education = 'Education',
  News = 'News',
}

export const TOPIC_LABELS = Object.values(Topic);

export const CATEGORY_COLORS: Record<Topic, string> = {
  [Topic.AI]: 'border-cat-ai text-cat-ai',
  [Topic.Gaming]: 'border-cat-gaming text-cat-gaming',
  [Topic.Politics]: 'border-cat-politics text-cat-politics',
  [Topic.Science]: 'border-cat-science text-cat-science',
  [Topic.Business]: 'border-cat-business text-cat-business',
  [Topic.Education]: 'border-cat-education text-cat-education',
  [Topic.News]: 'border-cat-news text-cat-news',
};
