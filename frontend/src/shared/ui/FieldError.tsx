import type { ReactNode } from 'react';

interface FieldErrorProps {
  /** Use `getFieldIds(controlId).error` so the control can reference it with `aria-describedby`. */
  id?: string;
  /** The message. Nothing is rendered while it is empty. */
  children?: ReactNode;
}

/**
 * The validation error of a field. It is a live region (`role="alert"`), so it is announced when
 * it appears; the control references it with `aria-describedby`, which only reads it again when the
 * control is focused. Render at most one error node per field.
 */
export default function FieldError({ id, children }: FieldErrorProps) {
  if (!children) return null;

  return (
    <p id={id} role="alert" className="text-xs text-red-500">
      {children}
    </p>
  );
}
