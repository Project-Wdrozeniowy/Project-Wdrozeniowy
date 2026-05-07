import { Topic } from '@/constants/dashboard';
import type { Post } from '@/types';

export const CATEGORIES = ['All', ...Object.values(Topic)];

export const CATEGORY_COLORS: Record<string, string> = {
  [Topic.AI]: 'border-blue-500 text-blue-400',
  [Topic.Gaming]: 'border-green-500 text-green-400',
  [Topic.Science]: 'border-violet-500 text-violet-400',
  [Topic.Politics]: 'border-red-500 text-red-400',
  [Topic.Business]: 'border-amber-500 text-amber-400',
  [Topic.Education]: 'border-teal-500 text-teal-400',
  [Topic.News]: 'border-gray-500 text-gray-400',
};

export const MOCK_POSTS: Post[] = [
  {
    id: '1',
    username: 'u/johndoe',
    userInitial: 'J',
    timeAgo: '2 hours ago',
    badge: 'trending',
    category: Topic.AI,
    title: 'Check out this amazing new technology!',
    excerpt:
      "I've been working with this new framework and it's absolutely blowing my mind. The performance improvements are incredible compared to anything I've used before.",
    votes: 330,
    comments: 45,
  },
  {
    id: '2',
    username: 'u/techguru',
    userInitial: 'T',
    timeAgo: '4 hours ago',
    badge: null,
    category: Topic.Gaming,
    title: 'New update completely changes the competitive meta',
    excerpt:
      'After the latest patch, the entire ranked ecosystem has shifted. Here is a breakdown of which characters rose and fell — and why it matters for tournaments.',
    votes: 212,
    comments: 89,
  },
  {
    id: '3',
    username: 'u/sciencefan',
    userInitial: 'S',
    timeAgo: '6 hours ago',
    badge: 'hot',
    category: Topic.Science,
    title: 'Researchers discover groundbreaking carbon capture method',
    excerpt:
      'A new approach combining bio-engineered algae with industrial filtration has shown a 400% increase in CO₂ absorption efficiency — published in Nature this week.',
    votes: 567,
    comments: 123,
  },
  {
    id: '4',
    username: 'u/politicswatch',
    userInitial: 'P',
    timeAgo: '8 hours ago',
    badge: null,
    category: Topic.Politics,
    title: 'Senate committee reaches bipartisan agreement on infrastructure',
    excerpt:
      'After months of negotiations, both parties have agreed on a $1.2T package targeting roads, broadband, and clean energy. Full details inside.',
    votes: 89,
    comments: 201,
  },
  {
    id: '5',
    username: 'u/entrepreneur',
    userInitial: 'E',
    timeAgo: '12 hours ago',
    badge: null,
    category: Topic.Business,
    title: 'This startup raised $50M by solving a deceptively simple problem',
    excerpt:
      'Forget AI unicorns — this founder built a $50M business automating invoice reconciliation for mid-sized companies. Their story is a masterclass in focus.',
    votes: 445,
    comments: 67,
  },
  {
    id: '6',
    username: 'u/learner42',
    userInitial: 'L',
    timeAgo: '1 day ago',
    badge: null,
    category: Topic.Education,
    title: 'Free resource compiles every major programming concept in one place',
    excerpt:
      'A solo dev spent two years building a comprehensive open-source reference covering algorithms, system design, and language-specific patterns. It is completely free.',
    votes: 1200,
    comments: 234,
  },
];
