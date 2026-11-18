import { ChartBarIcon } from '@/shared/ui/icons';

interface StatCardProps {
  label: string;
  value: number;
  change: number;
}

export default function StatCard({ label, value, change }: StatCardProps) {
  const isPositive = change >= 0;
  return (
    <div className="bg-surface rounded-xl p-5 flex items-start justify-between gap-3 border border-line">
      <div className="flex flex-col gap-1">
        <span className="text-fg-subtle text-sm">{label}</span>
        <span className="text-fg font-bold text-3xl">{value.toLocaleString()}</span>
        <span className={isPositive ? 'text-sm text-success' : 'text-sm text-danger'}>
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
