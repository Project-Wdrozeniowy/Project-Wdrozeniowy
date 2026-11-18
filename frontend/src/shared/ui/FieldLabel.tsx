import { cn } from '@/shared/lib/cn';

interface FieldLabelProps {
  /** Id of the control the label focuses. */
  htmlFor?: string;
  label: string;
  /** Adds a visual `*`. It is hidden from assistive technology: mark the control as required there. */
  required?: boolean;
  /** Shown on the right as `used/max`, in red once `used` exceeds `max`. Hidden from assistive technology. */
  counter?: { used: number; max: number };
}

/**
 * The label row of a field: the label, an optional required marker and an optional character
 * counter. Use it on its own when the hint and the error cannot follow the control in one block
 * (see `FormField` for the common layout).
 */
export default function FieldLabel({ htmlFor, label, required, counter }: FieldLabelProps) {
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
