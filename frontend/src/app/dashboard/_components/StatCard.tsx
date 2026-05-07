import { ChartBarIcon } from '@/components/ui/icons';

export default function StatCard({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change: number;
}) {
  const isPositive = change >= 0;
  return (
    <div className="bg-slate-800 rounded-xl p-5 flex items-start justify-between gap-3">
      <div className="flex flex-col gap-1">
        <span className="text-slate-400 text-sm">{label}</span>
        <span className="text-gray-50 font-bold text-3xl">{value}</span>
        <span className={`text-sm ${isPositive ? 'text-emerald-400' : 'text-red-400'}`}>
          {isPositive ? '+' : ''}
          {change}%
        </span>
      </div>
      <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center shrink-0">
        <ChartBarIcon />
      </div>
    </div>
  );
}
