import { useSearchParams } from 'react-router';
import { DASHBOARD_SUBTITLE, DASHBOARD_TITLE } from '@/pages/dashboard/config/dashboard.const';
import {
  DEFAULT_ANALYTICS_PERIOD,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import ChartsSection from './ChartsSection';
import PeriodSwitch from './PeriodSwitch';
import StatsSection from './StatsSection';
import TopPostsCard from './TopPostsCard';
import useDashboardScroll from '@/pages/dashboard/lib/useDashboardScroll';

export default function DashboardPage() {
  const scrollRef = useDashboardScroll();
  const [params, setParams] = useSearchParams();
  const period: AnalyticsPeriod = params.get('period') === '30d' ? '30d' : DEFAULT_ANALYTICS_PERIOD;
  const metricId = params.get('metric') === 'comments' ? 'comments' : 'posts';
  function changeSetting(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        next.set(key, value);
        return next;
      },
      { replace: true, preventScrollReset: true }
    );
  }

  return (
    <div ref={scrollRef} className="flex flex-col gap-6">
      <div>
        <h1 className="text-fg font-bold text-3xl">{DASHBOARD_TITLE}</h1>
        <p className="text-fg-subtle text-base mt-1">{DASHBOARD_SUBTITLE}</p>
      </div>

      <PeriodSwitch value={period} onChange={(value) => changeSetting('period', value)} />
      <StatsSection period={period} />
      <ChartsSection
        period={period}
        metricId={metricId}
        onMetricChange={(value) => changeSetting('metric', value)}
        activityTableOpen={params.get('activityTable') === '1'}
        onActivityTableOpenChange={(open) => changeSetting('activityTable', open ? '1' : '0')}
        categoryTableOpen={params.get('categoryTable') === '1'}
        onCategoryTableOpenChange={(open) => changeSetting('categoryTable', open ? '1' : '0')}
      />
      <TopPostsCard period={period} />
    </div>
  );
}
