import {
  STATS,
  TOP_POSTS,
  LINE_DATA_POSTS,
  LINE_DATA_ENGAGEMENT,
  BAR_DATA_HOURS,
  BAR_DATA_TOPICS,
  TOPIC_LABELS,
  MONTHS,
} from '@/constants/dashboard';

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-gray-50 font-bold text-3xl">Analytics Dashboard</h1>
        <p className="text-slate-400 text-base mt-1">Real-time insights and statistics</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {STATS.map(({ label, value, change, positive }) => (
          <StatCard key={label} label={label} value={value} change={change} positive={positive} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Posts Over Time">
          <LineChart data={LINE_DATA_POSTS} labels={MONTHS} />
        </ChartCard>
        <ChartCard title="User Activity by Hour">
          <BarChart data={BAR_DATA_HOURS} />
        </ChartCard>
        <ChartCard title="Topic Distribution">
          <BarChart data={BAR_DATA_TOPICS} labels={TOPIC_LABELS} color="#8b5cf6" />
        </ChartCard>
        <ChartCard title="Engagement Trends">
          <LineChart data={LINE_DATA_ENGAGEMENT} labels={MONTHS} color="#10b981" />
        </ChartCard>
      </div>

      <div className="bg-slate-800 rounded-xl p-5 flex flex-col gap-4">
        <h2 className="text-gray-50 font-semibold text-xl">Top Performing Posts</h2>
        <div className="flex flex-col gap-2">
          {TOP_POSTS.map(({ title, views, engagement }, i) => (
            <TopPostRow key={title} rank={i + 1} title={title} views={views} engagement={engagement} />
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="text-gray-50 font-bold text-3xl">{value}</span>
        <span className={`text-sm ${positive ? 'text-emerald-400' : 'text-red-400'}`}>{change}</span>
      </div>
      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
        <ChartBarIcon />
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <h2 className="text-gray-50 font-semibold text-xl">{title}</h2>
      {children}
    </div>
  );
}

function TopPostRow({ rank, title, views, engagement }: { rank: number; title: string; views: string; engagement: string }) {
  return (
    <div className="bg-slate-700 rounded-lg px-4 py-3 flex items-center gap-4">
      <span className="text-slate-400 font-bold text-base w-5 shrink-0">#{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{title}</p>
        <p className="text-slate-400 text-xs">{views}</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-emerald-400 font-semibold text-sm">{engagement}</p>
        <p className="text-slate-400 text-xs">engagement</p>
      </div>
    </div>
  );
}

function LineChart({ data, labels, color = '#2563eb' }: { data: number[]; labels?: string[]; color?: string }) {
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

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[pts.length - 1].x.toFixed(1)},${(pad.top + ch).toFixed(1)} L${pts[0].x.toFixed(1)},${(pad.top + ch).toFixed(1)} Z`;

  const gridYs = [0, 0.25, 0.5, 0.75, 1].map((t) => pad.top + t * ch);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" aria-hidden>
      {gridYs.map((y) => (
        <line key={y} x1={pad.left} y1={y} x2={pad.left + cw} y2={y} stroke="rgb(51 65 85)" strokeWidth="1" />
      ))}
      <defs>
        <linearGradient id={`area-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#area-${color.replace('#', '')})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
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

function BarChart({ data, labels, color = '#2563eb' }: { data: number[]; labels?: string[]; color?: string }) {
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
        <line key={y} x1={pad.left} y1={y} x2={pad.left + cw} y2={y} stroke="rgb(51 65 85)" strokeWidth="1" />
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

function ChartBarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}
