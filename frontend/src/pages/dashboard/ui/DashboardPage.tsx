import { useState } from 'react';
import { DASHBOARD_SUBTITLE, DASHBOARD_TITLE } from '@/pages/dashboard/config/dashboard.const';
import {
  DEFAULT_ANALYTICS_PERIOD,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import ChartsSection from './ChartsSection';
import PeriodSwitch from './PeriodSwitch';
import StatsSection from './StatsSection';
import TopPostsCard from './TopPostsCard';

export default function DashboardPage() {
  const [period, setPeriod] = useState<AnalyticsPeriod>(DEFAULT_ANALYTICS_PERIOD);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-fg font-bold text-3xl">{DASHBOARD_TITLE}</h1>
        <p className="text-fg-subtle text-base mt-1">{DASHBOARD_SUBTITLE}</p>
      </div>

      <PeriodSwitch value={period} onChange={setPeriod} />
      {/* First under the window choice, as in the design. */}
      <TopPostsCard period={period} />
      <StatsSection period={period} />
      <ChartsSection period={period} />
    </div>
  );
}
