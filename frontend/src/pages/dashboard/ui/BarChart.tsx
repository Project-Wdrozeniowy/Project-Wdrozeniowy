interface BarChartProps {
  data: number[];
  labels?: string[];
  color?: string;
  /** What the chart says, for people who cannot see it. */
  summary: string;
}

const MAX_LABEL_LENGTH = 8;

/** A bar chart of non-negative counts. Text and grid follow the theme through tokens. */
export default function BarChart({ data, labels, color = '#2563eb', summary }: BarChartProps) {
  const w = 420;
  const h = 200;
  const pad = { top: 16, right: 16, bottom: labels ? 32 : 16, left: 36 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const max = Math.max(1, ...data);
  const gap = data.length ? cw / data.length : cw;
  const barW = gap * 0.65;
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
      {data.map((d, i) => {
        const barH = (d / max) * ch;
        const x = pad.left + i * gap + (gap - barW) / 2;
        const y = pad.top + ch - barH;
        const label = labels?.[i];
        return (
          <g key={i}>
            <title>{`${label ?? i + 1}: ${d}`}</title>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx="2" opacity="0.85" />
            {label && (
              <text
                x={x + barW / 2}
                y={h - 6}
                textAnchor="middle"
                className="fill-fg-subtle"
                fontSize="10"
              >
                {label.length > MAX_LABEL_LENGTH
                  ? `${label.slice(0, MAX_LABEL_LENGTH - 1)}…`
                  : label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
