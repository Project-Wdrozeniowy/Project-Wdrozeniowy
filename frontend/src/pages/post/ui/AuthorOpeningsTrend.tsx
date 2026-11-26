import { useId, useRef, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import type { AnalyticsPeriod } from '@/shared/api/analytics/analytics.const';
import type { PostOpeningTrendDto } from '@/shared/api/generated/models/postOpeningTrendDto.dto';
import { missingDaysNote, openingsMetric, trendDescription } from '@/pages/post/lib/openingsTrend';
import { utcDay } from '@/pages/post/lib/postInsights';
import InsightsGraph from './InsightsGraph';
import InsightsIcon from './InsightsIcon';
import {
  TREND_TITLE,
  TREND_WINDOW_LABEL,
  TREND_WINDOW_OPTIONS,
} from '@/pages/post/config/postInsights.const';

interface AuthorOpeningsTrendProps {
  trend: UseQueryResult<PostOpeningTrendDto, unknown>;
  period: AnalyticsPeriod;
  onPeriodChange: (period: AnalyticsPeriod) => void;
}

export default function AuthorOpeningsTrend({
  trend,
  period,
  onPeriodChange,
}: AuthorOpeningsTrendProps) {
  const [tableOpen, setTableOpen] = useState(false);
  const tableId = useId();
  const radioRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const data = trend.data;
  const points = openingsMetric(data).points;
  const measured = points.flatMap((p) => (p.value === null ? [] : [p.value]));
  const zero = measured.length > 0 && measured.every((value) => value === 0);
  const missing = points.some((p) => p.value === null);
  return (
    <section aria-label={TREND_TITLE} className="insights-trend">
      <div className={`insights-trend-heading ${missing || zero ? 'insights-annotated' : ''}`}>
        <div>
          <h3>{TREND_TITLE}</h3>
          <p className="insights-trend-description">
            {data ? trendDescription(data) : 'UTC · daily openings.'}
          </p>
        </div>
        {missing && data && (
          <div className="insights-missing">
            <InsightsIcon name="missing" />
            <div>
              <strong>Not measured</strong>
              {missingDaysNote(data)}
            </div>
          </div>
        )}
        <div className="insights-period" role="radiogroup" aria-label={TREND_WINDOW_LABEL}>
          {TREND_WINDOW_OPTIONS.map(({ id: value, label }, index) => (
            <button
              key={value}
              ref={(el) => {
                radioRefs.current[index] = el;
              }}
              type="button"
              role="radio"
              aria-checked={period === value}
              tabIndex={period === value ? 0 : -1}
              onClick={() => onPeriodChange(value)}
              onKeyDown={(event) => {
                if (
                  !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(
                    event.key
                  )
                )
                  return;
                event.preventDefault();
                const next = event.key === 'Home' ? 0 : event.key === 'End' ? 1 : 1 - index;
                onPeriodChange(next === 0 ? '7d' : '30d');
                radioRefs.current[next]?.focus();
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {data ? (
        <InsightsGraph data={data} />
      ) : (
        <div role="status" aria-label="Loading chart" className="insights-loading-chart" />
      )}
      <div className="insights-legend">
        {points.some((p) => p.partial) && (
          <span>
            <i aria-hidden="true" />
            Today (partial)
          </span>
        )}
        {missing && (
          <span>
            <i className="insights-missing-key" aria-hidden="true" />
            Not measured
          </span>
        )}
      </div>
      <div className="insights-table-wrap" hidden={!data}>
        <button
          type="button"
          aria-expanded={tableOpen}
          aria-controls={tableId}
          className="insights-table-toggle"
          onClick={() => setTableOpen((v) => !v)}
        >
          Data table
          <InsightsIcon name="chevron" className={tableOpen ? 'insights-up' : ''} />
        </button>
        <div id={tableId} hidden={!tableOpen} className="insights-table-content">
          <table>
            <caption>Openings per UTC day</caption>
            <thead>
              <tr>
                <th scope="col">Date (UTC)</th>
                <th scope="col">Openings</th>
              </tr>
            </thead>
            <tbody>
              {data?.days.map((day) => (
                <tr key={day.date}>
                  <th scope="row">
                    {day.date}
                    {day.date === utcDay(data.generatedAt) ? ' (today, partial)' : ''}
                  </th>
                  <td>{day.measured ? day.openings : 'Not measured'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="insights-notice insights-privacy">
        <InsightsIcon name="privacy" />
        <div>
          <h3>Private author context</h3>
          <p>
            Only aggregate counts are shown. No reader identities. Openings are not unique readers
            or reach, and they do not show what caused a change.
          </p>
        </div>
      </div>
    </section>
  );
}
