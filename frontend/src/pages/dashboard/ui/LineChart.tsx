import { useId } from 'react';

interface LineChartProps {
  data: number[];
  labels?: string[];
  color?: string;
  /** What the chart says, for people who cannot see it. */
  summary: string;
}

/** A line chart of non-negative counts. Text and grid follow the theme through tokens. */
export default function LineChart({ data, labels, color = '#2563eb', summary }: LineChartProps) {
  // One id per chart: two charts of the same colour must not share a gradient.
  const gradientId = `area-${useId().replace(/:/g, '')}`;
  const w = 420;
  const h = 200;
  const pad = { top: 16, right: 16, bottom: 32, left: 36 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const max = Math.max(1, ...data);
  const xOf = (i: number) => pad.left + (data.length > 1 ? (i / (data.length - 1)) * cw : cw / 2);
  const yOf = (d: number) => pad.top + ch - (d / max) * ch;

  const pts = data.map((d, i) => ({ x: xOf(i), y: yOf(d) }));
  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const base = (pad.top + ch).toFixed(1);
  const areaPath = pts.length
    ? `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${base} L${pts[0].x.toFixed(1)},${base} Z`
    : '';
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => pad.top + t * ch);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img" aria-label={summary}>
      {gridYs.map((y) => (
        <line
          key={y}
          x1={pad.left}
          y1={y}
          x2={pad.left + cw}
          y2={y}
          className="stroke-line"
          strokeWidth="1"
        />
      ))}
      <text
        x={pad.left - 6}
        y={pad.top + 4}
        textAnchor="end"
        className="fill-fg-subtle"
        fontSize="10"
      >
        {max}
      </text>
      <text
        x={pad.left - 6}
        y={pad.top + ch + 4}
        textAnchor="end"
        className="fill-fg-subtle"
        fontSize="10"
      >
        0
      </text>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
      <path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3" fill={color} />
      ))}
      {labels?.map((label, i) =>
        label ? (
          <text
            key={i}
            x={xOf(i)}
            y={h - 6}
            textAnchor="middle"
            className="fill-fg-subtle"
            fontSize="10"
          >
            {label}
          </text>
        ) : null
      )}
    </svg>
  );
}
