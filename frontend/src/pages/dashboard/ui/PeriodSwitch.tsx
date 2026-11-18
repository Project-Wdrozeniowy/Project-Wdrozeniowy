import { PERIOD_SWITCH_LABEL } from '@/pages/dashboard/config/dashboard.const';
import {
  ANALYTICS_PERIODS,
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsPeriod,
} from '@/shared/api/analytics/analytics.const';
import { cn } from '@/shared/lib/cn';

interface PeriodSwitchProps {
  value: AnalyticsPeriod;
  onChange: (period: AnalyticsPeriod) => void;
}

export default function PeriodSwitch({ value, onChange }: PeriodSwitchProps) {
  return (
    <div
      role="group"
      aria-label={PERIOD_SWITCH_LABEL}
      className="bg-raised rounded-xl p-1 flex gap-1 self-start"
    >
      {ANALYTICS_PERIODS.map((period) => (
        <button
          key={period}
          type="button"
          onClick={() => onChange(period)}
          aria-pressed={value === period}
          className={cn(
            'px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-500',
            value === period ? 'bg-surface text-fg shadow-sm' : 'text-fg-subtle hover:text-fg'
          )}
        >
          {ANALYTICS_PERIOD_LABELS[period]}
        </button>
      ))}
    </div>
  );
}
