export default function LineChart({
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
  const pad = { top: 16, right: 16, bottom: 32, left: 36 };
  const cw = w - pad.left - pad.right;
  const ch = h - pad.top - pad.bottom;

  const max = Math.max(...data);
  const min = Math.min(...data) * 0.8;
  const range = max - min || 1;

  const pts = data.map((d, i) => ({
    x: pad.left + (i / (data.length - 1)) * cw,
    y: pad.top + ch - ((d - min) / range) * ch,
  }));

  const linePath = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(pad.top + ch).toFixed(1)} L${pts[0].x.toFixed(1)},${(pad.top + ch).toFixed(1)} Z`;
  const gradientId = `area-${color.replace('#', '')}`;
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
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} />
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
      {labels &&
        labels
          .filter((_, i) => i % 2 === 0)
          .map((label, idx) => {
            const i = idx * 2;
            return (
              <text
                key={label}
                x={pad.left + (i / (data.length - 1)) * cw}
                y={h - 6}
                textAnchor="middle"
                fill="rgb(148 163 184)"
                fontSize="10"
              >
                {label}
              </text>
            );
          })}
    </svg>
  );
}
