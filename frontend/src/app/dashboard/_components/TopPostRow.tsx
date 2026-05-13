import { toPercent } from '@/utils/format';

export default function TopPostRow({
  rank,
  title,
  views,
  engagement,
}: {
  rank: number;
  title: string;
  views: number;
  engagement: number;
}) {
  return (
    <div className="bg-slate-700 rounded-lg px-4 py-3 flex items-center gap-4">
      <span className="text-slate-400 font-bold text-base w-5 shrink-0">#{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm truncate">{title}</p>
        <p className="text-slate-400 text-xs">{views.toLocaleString()} views</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-emerald-400 font-semibold text-sm">{toPercent(engagement)}</p>
        <p className="text-slate-400 text-xs">engagement</p>
      </div>
    </div>
  );
}
