import { Topic } from '@/constants/categories';
import type { Post } from '@/types';

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

export const TOP_POSTS = [
  { title: 'Amazing new tech discovery', views: 12300, engagement: 0.89 },
  { title: 'Senate reaches bipartisan infrastructure deal', views: 8700, engagement: 0.76 },
  { title: 'Scientists develop efficient carbon capture', views: 7200, engagement: 0.82 },
  { title: 'Gaming meta shift after patch 2.4', views: 5900, engagement: 0.71 },
  { title: 'Free programming resources collection', views: 4800, engagement: 0.68 },
];

export const POSTS_PER_MONTH = [40, 58, 45, 72, 65, 88, 74, 105, 92, 118, 98, 140];

export const POSTS_BY_TOPIC = [88, 62, 45, 72, 55, 38, 30];
