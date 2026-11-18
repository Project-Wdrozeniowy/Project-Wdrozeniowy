import type { ReactNode } from 'react';
import FieldError from '@/shared/ui/FieldError';
import FieldHint from '@/shared/ui/FieldHint';
import FieldLabel from '@/shared/ui/FieldLabel';
import { getFieldIds } from '@/shared/ui/fieldA11y';

interface FormFieldProps {
  label: string;
  /** Helper text shown under the control. */
  hint?: ReactNode;
  /** The control's id. Without it the label, hint and error cannot be associated with the control. */
  id?: string;
  /** The validation error shown under the hint. Nothing is rendered while it is empty. */
  error?: ReactNode;
  /** Adds the visual required marker. Pass `required` to `getFieldControlProps` for the control. */
  required?: boolean;
  /** Shows `used/max` next to the label. */
  counter?: { used: number; max: number };
  /** The control. Give it `getFieldControlProps({ id, ... })` so it references the hint and error. */
  children: ReactNode;
}

/**
 * The common field layout: label row, the control, a hint and an error, in that order. The control
 * stays in the caller's hands (composition), so `input`, `select`, `textarea` and custom inputs are
 * wired the same way with `getFieldControlProps`. For a layout that differs (for example a hint
 * above the control) compose `FieldLabel`, `FieldHint` and `FieldError` directly.
 */
export default function FormField({
  label,
  hint,
  id,
  error,
  required,
  counter,
  children,
}: FormFieldProps) {
  const ids = id ? getFieldIds(id) : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <FieldLabel htmlFor={id} label={label} required={required} counter={counter} />
      {children}
      {hint && <FieldHint id={ids?.hint}>{hint}</FieldHint>}
      <FieldError id={ids?.error}>{error}</FieldError>
    </div>
  );
}
