import { cn } from '@/shared/lib/cn';

interface FieldLabelProps {
  htmlFor: string;
  label: string;
  required?: boolean;
  /** Shown on the right as `used/max`. */
  counter?: { used: number; max: number };
}

export function FieldLabel({ htmlFor, label, required, counter }: FieldLabelProps) {
  return (
    <div className="flex items-baseline justify-between">
      <label htmlFor={htmlFor} className="text-sm font-semibold text-gray-900">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-0.5 text-red-500">
            *
          </span>
        )}
      </label>
      {counter && (
        <span
          aria-hidden="true"
          className={cn('text-xs text-gray-500', counter.used > counter.max && 'text-red-500')}
        >
          {counter.used}/{counter.max}
        </span>
      )}
    </div>
  );
}
