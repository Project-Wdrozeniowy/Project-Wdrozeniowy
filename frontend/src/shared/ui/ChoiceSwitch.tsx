import { useId } from 'react';
import { cn } from '@/shared/lib/cn';

interface ChoiceSwitchOption<T extends string> {
  id: T;
  label: string;
}

interface ChoiceSwitchProps<T extends string> {
  /** Names the group for assistive technology ("Metric", "Time window"); not drawn. */
  legend: string;
  options: ChoiceSwitchOption<T>[];
  /** The id of the chosen option. */
  value: T;
  onChange: (id: T) => void;
}

/**
 * A segmented choice of one option out of a few (a metric, a time window). Native radio buttons:
 * Tab enters the group, the arrow keys move and select, and assistive technology announces the
 * choice and its position without extra roles.
 */
export default function ChoiceSwitch<T extends string>({
  legend,
  options,
  value,
  onChange,
}: ChoiceSwitchProps<T>) {
  const groupName = useId();

  return (
    <fieldset className="bg-raised rounded-xl p-1 flex flex-wrap gap-1 self-start m-0 border-0 min-w-0">
      <legend className="sr-only">{legend}</legend>
      {options.map((option) => (
        <label key={option.id} className="relative">
          <input
            type="radio"
            name={groupName}
            value={option.id}
            checked={option.id === value}
            onChange={() => onChange(option.id)}
            className="peer sr-only"
          />
          <span
            className={cn(
              'block px-4 py-1.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors',
              'peer-focus-visible:outline-2 peer-focus-visible:outline-blue-500',
              option.id === value ? 'bg-surface text-fg shadow-sm' : 'text-fg-subtle hover:text-fg'
            )}
          >
            {option.label}
          </span>
        </label>
      ))}
    </fieldset>
  );
}
