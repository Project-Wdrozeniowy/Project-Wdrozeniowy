export default function BarChart({
  data,
  labels,
  color = '#2563eb',
}: {
  data: number[];
  labels?: string[];
  color?: string;
}) {
  const w = 420;
  const h = 200;
  const pad = { top: 16, right: 16, bottom: labels ? 32 : 16, left: 36 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const max = Math.max(...data);
  const barW = (cw / data.length) * 0.65;
  const gap = cw / data.length;
  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => pad.top + t * ch);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
      {gridYs.map((y) => (
        <line
          key={y}
          x1={pad.left}
          y1={y}
          x2={pad.left + cw}
          y2={y}
          stroke="rgb(51 65 85)"
          strokeWidth="1"
        />
      ))}
      {data.map((d, i) => {
        const barH = (d / max) * ch;
        const x = pad.left + i * gap + (gap - barW) / 2;
        const y = pad.top + ch - barH;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={color} rx="2" opacity="0.85" />
            {labels && (
              <text
                x={x + barW / 2}
                y={h - 6}
                textAnchor="middle"
                fill="rgb(148 163 184)"
                fontSize="10"
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
