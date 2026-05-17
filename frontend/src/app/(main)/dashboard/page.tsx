import { STATS, ENGAGEMENT_PER_MONTH, ACTIVITY_BY_HOUR, MONTHS } from '@/constants/dashboard';
import { TOPIC_LABELS } from '@/constants/categories';
import { POSTS_PER_MONTH, POSTS_BY_TOPIC } from '@/constants/posts';
import StatCard from './_components/StatCard';
import ChartCard from './_components/ChartCard';
import PostsCard from './_components/PostsCard';
import LineChart from './_components/LineChart';
import BarChart from './_components/BarChart';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-gray-50 font-bold text-3xl">Analytics Dashboard</h1>
        <p className="text-slate-400 text-base mt-1">Real-time insights and statistics</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {STATS.map(({ label, value, change }) => (
          <StatCard key={label} label={label} value={value} change={change} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Posts Over Time">
          <LineChart data={POSTS_PER_MONTH} labels={MONTHS} />
        </ChartCard>
        <ChartCard title="User Activity by Hour">
          <BarChart data={ACTIVITY_BY_HOUR} />
        </ChartCard>
        <ChartCard title="Topic Distribution">
          <BarChart data={POSTS_BY_TOPIC} labels={TOPIC_LABELS} color="#8b5cf6" />
        </ChartCard>
        <ChartCard title="Engagement Trends">
          <LineChart data={ENGAGEMENT_PER_MONTH} labels={MONTHS} color="#10b981" />
        </ChartCard>
      </div>

      <PostsCard />
    </div>
  );
}
