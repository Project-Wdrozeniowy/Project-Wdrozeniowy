import { GRID_DASH, MISSING_VALUE_TEXT } from '@/widgets/activity-chart/config/activityChart.const';
import type { ActivityMetric } from '@/widgets/activity-chart/lib/activityView';

interface ActivityLegendProps {
  metric: ActivityMetric;
  /** Some day has no value: say what its dashed mark means. */
  hasMissing: boolean;
  color: string;
}

/**
 * Under the graph, as in the dashboard frames: the metric's swatch and name. Hidden from assistive
 * technology, which has the caption and the table; the legend only explains the marks by sight.
 */
export default function ActivityLegend({ metric, hasMissing, color }: ActivityLegendProps) {
  return (
    <p aria-hidden="true" className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm">
      <span className="inline-flex items-center gap-1.5" style={{ color }}>
        <span className="inline-block size-3 rounded-sm" style={{ backgroundColor: color }} />
        {metric.name.toLowerCase()}
      </span>
      {hasMissing && (
        <span className="inline-flex items-center gap-1.5 text-fg-subtle">
          <svg width="16" height="4" aria-hidden="true">
            <line
              x1="0"
              y1="2"
              x2="16"
              y2="2"
              className="stroke-fg-subtle"
              strokeWidth="1.5"
              strokeDasharray={GRID_DASH}
            />
          </svg>
          {MISSING_VALUE_TEXT.toLowerCase()}
        </span>
      )}
    </p>
  );
}
