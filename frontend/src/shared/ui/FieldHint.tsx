import type { ReactNode } from 'react';

interface FieldHintProps {
  /** Use `getFieldIds(controlId).hint` so the control can reference it with `aria-describedby`. */
  id?: string;
  children: ReactNode;
}

/** Helper text for a field. It is announced with the control when the control references its id. */
export default function FieldHint({ id, children }: FieldHintProps) {
  return (
    <p id={id} className="text-xs text-gray-500">
      {children}
    </p>
  );
}
