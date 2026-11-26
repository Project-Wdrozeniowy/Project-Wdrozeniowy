import { useEffect, useRef, useState } from 'react';
import { insightsAxis } from '@/pages/post/lib/insightsChart';
import { openingsMetric } from '@/pages/post/lib/openingsTrend';
import { chartSummary } from '@/widgets/activity-chart';
import type { PostOpeningTrendDto } from '@/shared/api/generated/models/postOpeningTrendDto.dto';

interface InsightsGraphProps {
  data: PostOpeningTrendDto;
}

/** Data-driven geometry of the Figma bar chart; labels keep a real 12px size on resize. */
export default function InsightsGraph({ data }: InsightsGraphProps) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(638);
  useEffect(() => {
    const target = host.current;
    if (!target || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) =>
      setWidth(Math.max(160, entry.contentRect.width))
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, []);
  const metric = openingsMetric(data);
  const { top, ticks } = insightsAxis(Math.max(0, ...metric.points.map((p) => p.value ?? 0)));
  const left = 36;
  const right = 16;
  const compactHeight = window.matchMedia?.('(max-width: 639px)').matches ?? false;
  const height = compactHeight ? 144 : 176;
  const baseline = height - 30;
  const plotHeight = baseline - 8;
  const slot = (width - 44 - 24) / Math.max(1, metric.points.length);
  const mobile = width < 480;
  const partialWindow = metric.points.some((point) => point.value === null);
  const labelCount = data.period === '30d' ? (mobile ? 3 : 5) : mobile || partialWindow ? 4 : 7;
  const labels = new Set(
    Array.from({ length: labelCount }, (_, i) =>
      data.period === '30d' && mobile && i === 1
        ? 12
        : Math.floor((i * (metric.points.length - 1)) / (labelCount - 1))
    )
  );
  return (
    <div ref={host} className="insights-graph">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={chartSummary(
          metric,
          data.period === '7d' ? 'Last 7 days' : 'Last 30 days',
          'Not measured'
        )}
      >
        {ticks.map((tick) => {
          const y = baseline - (tick / top) * plotHeight;
          return (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={y}
                y2={y}
                stroke="var(--insights-line)"
                strokeDasharray="3 3"
              />
              <text x={left - 8} y={y + 4} textAnchor="end" fill="var(--fg-subtle)" fontSize="12">
                {tick}
              </text>
            </g>
          );
        })}
        {metric.points.map((point, i) => {
          const x = 44 + i * slot + slot * 0.1;
          const barWidth = slot * 0.8;
          const barHeight = point.value === null ? 0 : (point.value / top) * plotHeight;
          return (
            <g key={point.date}>
              {point.value === null ? (
                <line
                  x1={x}
                  x2={x + barWidth}
                  y1={baseline}
                  y2={baseline}
                  stroke="var(--fg-subtle)"
                  strokeDasharray="3 3"
                  strokeWidth="2"
                />
              ) : (
                <rect
                  x={x}
                  y={baseline - Math.max(barHeight, 1)}
                  width={barWidth}
                  height={Math.max(barHeight, 1)}
                  rx="3"
                  fill={point.partial ? 'var(--insights-partial-fill)' : 'var(--insights-bar)'}
                  stroke={point.partial ? 'var(--insights-chart)' : 'none'}
                />
              )}
              {labels.has(i) && (
                <text
                  x={44 + (i + 0.5) * slot}
                  y={height - 14}
                  textAnchor="middle"
                  fill="var(--fg-subtle)"
                  fontSize="12"
                >
                  {new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    timeZone: 'UTC',
                  }).format(new Date(`${point.date}T00:00:00Z`))}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
