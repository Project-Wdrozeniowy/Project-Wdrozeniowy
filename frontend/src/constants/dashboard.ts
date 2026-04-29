export enum Topic {
  AI = 'AI',
  Gaming = 'Gaming',
  Politics = 'Politics',
  Science = 'Science',
  Business = 'Business',
  Education = 'Education',
  News = 'News',
}

export const TOPIC_LABELS = Object.values(Topic);

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const STATS = [
  { label: 'Total Posts Today', value: '1,234', change: '+12.5% from yesterday', positive: true },
  { label: 'Active Users', value: '8,432', change: '+5.2% from last week', positive: true },
  { label: 'Trending Posts', value: '23', change: '-3.1% from yesterday', positive: false },
  { label: 'Total Views', value: '45.2K', change: '+18.3% from last week', positive: true },
];

export const TOP_POSTS = [
  { title: 'Amazing new tech discovery', views: '12.3K views', engagement: '89%' },
  { title: 'Senate reaches bipartisan infrastructure deal', views: '8.7K views', engagement: '76%' },
  { title: 'Scientists develop efficient carbon capture', views: '7.2K views', engagement: '82%' },
  { title: 'Gaming meta shift after patch 2.4', views: '5.9K views', engagement: '71%' },
  { title: 'Free programming resources collection', views: '4.8K views', engagement: '68%' },
];

export const LINE_DATA_POSTS = [40, 58, 45, 72, 65, 88, 74, 105, 92, 118, 98, 140];
export const LINE_DATA_ENGAGEMENT = [55, 62, 48, 70, 80, 75, 90, 85, 95, 88, 102, 110];
export const BAR_DATA_HOURS = [5, 8, 12, 18, 25, 30, 42, 55, 60, 58, 50, 45, 40, 38, 42, 50, 60, 65, 58, 45, 32, 20, 12, 7];
export const BAR_DATA_TOPICS = [88, 62, 45, 72, 55, 38, 30];
