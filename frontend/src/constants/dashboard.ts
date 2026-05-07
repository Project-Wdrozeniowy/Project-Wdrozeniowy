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

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export const STATS = [
  { label: 'Total Posts Today', value: '1,234', change: 12.5 },
  { label: 'Active Users', value: '8,432', change: 5.2 },
  { label: 'Trending Posts', value: '23', change: -3.1 },
  { label: 'Total Views', value: '45.2K', change: 18.3 },
];

export const TOP_POSTS = [
  { title: 'Amazing new tech discovery', views: 12300, engagement: 0.89 },
  { title: 'Senate reaches bipartisan infrastructure deal', views: 8700, engagement: 0.76 },
  { title: 'Scientists develop efficient carbon capture', views: 7200, engagement: 0.82 },
  { title: 'Gaming meta shift after patch 2.4', views: 5900, engagement: 0.71 },
  { title: 'Free programming resources collection', views: 4800, engagement: 0.68 },
];

// Monthly post counts for the Posts Over Time chart
export const POSTS_PER_MONTH = [40, 58, 45, 72, 65, 88, 74, 105, 92, 118, 98, 140];

// Monthly engagement scores for the Engagement Trends chart
export const ENGAGEMENT_PER_MONTH = [55, 62, 48, 70, 80, 75, 90, 85, 95, 88, 102, 110];

// Hourly activity counts (0–23h) for the User Activity by Hour chart
export const ACTIVITY_BY_HOUR = [5, 8, 12, 18, 25, 30, 42, 55, 60, 58, 50, 45, 40, 38, 42, 50, 60, 65, 58, 45, 32, 20, 12, 7];

// Post volume per topic, ordered to match TOPIC_LABELS
export const POSTS_BY_TOPIC = [88, 62, 45, 72, 55, 38, 30];
