import {
  DATE_COLUMN_LABEL,
  MISSING_VALUE_TEXT,
  PARTIAL_DAY_TEXT,
} from '@/widgets/activity-chart/config/activityChart.const';
import { fullDay, type ActivityMetric } from '@/widgets/activity-chart/lib/activityView';

interface ActivityTableProps {
  metric: ActivityMetric;
  /** What the table is about, as in the graph: metric, window and zone. */
  title: string;
}

/**
 * The same points as the graph, as a native table: the column headers name the metric, each row
 * header is the date, so a screen reader says "Nov 17, 2026, Posts, 3". A day without a value
 * says so in words, and a measured zero is a `0`.
 */
export default function ActivityTable({ metric, title }: ActivityTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-fg border-collapse">
        <caption className="text-left text-xs text-fg-subtle pb-2">{title}</caption>
        <thead>
          <tr className="border-b border-line text-fg-subtle">
            <th scope="col" className="text-left font-semibold py-1.5 pr-4">
              {DATE_COLUMN_LABEL}
            </th>
            <th scope="col" className="text-right font-semibold py-1.5">
              {metric.name}
            </th>
          </tr>
        </thead>
        <tbody>
          {metric.points.map((point) => (
            <tr key={point.date} className="border-b border-line last:border-b-0">
              <th scope="row" className="text-left font-normal py-1.5 pr-4">
                <time dateTime={point.date}>{fullDay(point.date)}</time>
                {point.partial && ` (${PARTIAL_DAY_TEXT})`}
              </th>
              <td className="text-right py-1.5 tabular-nums">
                {point.value === null ? (
                  <span className="italic text-fg-subtle">{MISSING_VALUE_TEXT}</span>
                ) : (
                  point.value
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
