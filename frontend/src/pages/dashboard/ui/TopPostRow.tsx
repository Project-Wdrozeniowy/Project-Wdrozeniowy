import { toPercent } from '@/utils/format';

interface TopPostRowProps {
  rank: number;
  title: string;
  views: number;
  engagement: number;
}

export default function TopPostRow({ rank, title, views, engagement }: TopPostRowProps) {
  return (
    <div className="bg-raised rounded-lg px-4 py-3 flex items-center gap-4">
      <span className="text-fg-subtle font-bold text-base w-5 shrink-0">#{rank}</span>
      <div className="flex-1 min-w-0">
        <p className="text-fg font-semibold text-sm truncate">{title}</p>
        <p className="text-fg-subtle text-xs">{views.toLocaleString()} views</p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-success font-semibold text-sm">{toPercent(engagement)}</p>
        <p className="text-fg-subtle text-xs">engagement</p>
      </div>
    </div>
  );
}
