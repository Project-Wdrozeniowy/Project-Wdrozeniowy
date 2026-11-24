import SkeletonStatus from '@/shared/ui/SkeletonStatus';
import { CHART_LOADING_LABEL } from '@/widgets/activity-chart/config/activityChart.const';

export default function ActivityChartSkeleton() {
  return (
    <SkeletonStatus label={CHART_LOADING_LABEL}>
      <div className="h-40 bg-raised rounded animate-pulse" />
    </SkeletonStatus>
  );
}
