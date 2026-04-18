import StatsGrid from './_components/StatsGrid';
import ChartCard from './_components/ChartCard';
import TopPosts from './_components/TopPosts';

const CHART_TITLES = [
  'Posts Over Time',
  'Engagement Trends',
  'Topic Distribution',
  'User Activity by Hour',
] as const;

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-gray-50 font-bold text-3xl">Analytics Dashboard</h1>
      <StatsGrid />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {CHART_TITLES.map((title) => (
          <ChartCard key={title} title={title} />
        ))}
      </div>
      <TopPosts />
    </div>
  );
}
