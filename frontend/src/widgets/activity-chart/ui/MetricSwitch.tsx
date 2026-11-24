import { useId } from 'react';
import { cn } from '@/shared/lib/cn';
import { METRIC_GROUP_LABEL } from '@/widgets/activity-chart/config/activityChart.const';
import type { ActivityMetric } from '@/widgets/activity-chart/lib/activityView';

interface MetricSwitchProps {
  metrics: ActivityMetric[];
  activeId: string;
  onChange: (id: string) => void;
}

/**
 * Chooses what the chart counts. Native radio buttons: Tab enters the group, the arrow keys move
 * and select, and assistive technology announces the choice and its position without extra roles.
 */
export default function MetricSwitch({ metrics, activeId, onChange }: MetricSwitchProps) {
  const groupName = useId();

  return (
    <fieldset className="bg-raised rounded-xl p-1 flex flex-wrap gap-1 self-start m-0 border-0 min-w-0">
      <legend className="sr-only">{METRIC_GROUP_LABEL}</legend>
      {metrics.map((metric) => (
        <label key={metric.id} className="relative">
          <input
            type="radio"
            name={groupName}
            value={metric.id}
            checked={metric.id === activeId}
            onChange={() => onChange(metric.id)}
            className="peer sr-only"
          />
          <span
            className={cn(
              'block px-4 py-1.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors',
              'peer-focus-visible:outline-2 peer-focus-visible:outline-blue-500',
              metric.id === activeId
                ? 'bg-surface text-fg shadow-sm'
                : 'text-fg-subtle hover:text-fg'
            )}
          >
            {metric.name}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
