export enum CategoryKey {
  AI = 'ai',
  GAMING = 'gaming',
  POLITICS = 'politics',
  SCIENCE = 'science',
  BUSINESS = 'business',
  EDUCATION = 'education',
  NEWS = 'news',
}

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

// Display-name enum used by the forum components
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

/** Filter value meaning "no topic selected". */
export const ALL_TOPICS = 'All';

export function isTopic(value: string | null): value is Topic {
  return TOPIC_LABELS.some((label) => label === value);
}

/** How a topic looks: the chip (a soft tint, a soft border, its own text colour) and the solid dot. */
export const CATEGORY_STYLES: Record<Topic, { chip: string; dot: string }> = {
  [Topic.AI]: { chip: 'border-cat-ai/40 bg-cat-ai/10 text-cat-ai', dot: 'bg-cat-ai' },
  [Topic.Gaming]: {
    chip: 'border-cat-gaming/40 bg-cat-gaming/10 text-cat-gaming',
    dot: 'bg-cat-gaming',
  },
  [Topic.Politics]: {
    chip: 'border-cat-politics/40 bg-cat-politics/10 text-cat-politics',
    dot: 'bg-cat-politics',
  },
  [Topic.Science]: {
    chip: 'border-cat-science/40 bg-cat-science/10 text-cat-science',
    dot: 'bg-cat-science',
  },
  [Topic.Business]: {
    chip: 'border-cat-business/40 bg-cat-business/10 text-cat-business',
    dot: 'bg-cat-business',
  },
  [Topic.Education]: {
    chip: 'border-cat-education/40 bg-cat-education/10 text-cat-education',
    dot: 'bg-cat-education',
  },
  [Topic.News]: { chip: 'border-cat-news/40 bg-cat-news/10 text-cat-news', dot: 'bg-cat-news' },
};
