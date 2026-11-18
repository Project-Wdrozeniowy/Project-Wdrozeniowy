/** The ids of the hint and error nodes of the control with this id. */
export function getFieldIds(id: string) {
  return { hint: `${id}-hint`, error: `${id}-error` };
}

interface FieldControlOptions {
  /** The control's id; the label's `htmlFor` and the hint and error ids derive from it. */
  id: string;
  /** A `FieldHint` with `getFieldIds(id).hint` is rendered. */
  hasHint?: boolean;
  /** A `FieldError` with `getFieldIds(id).error` is rendered. */
  hasError?: boolean;
  /** Overrides `aria-invalid`, for a control that is invalid without that error node. */
  invalid?: boolean;
  /** The field is required: adds `aria-required`, the counterpart of the visual `*` marker. */
  required?: boolean;
}

interface FieldControlProps {
  id: string;
  'aria-invalid': boolean;
  'aria-describedby': string | undefined;
  'aria-required': true | undefined;
}

/**
 * The accessibility attributes of a control (input, select, textarea or a custom input) inside a
 * field: its id, `aria-invalid`, and `aria-describedby` listing only the hint and error nodes that
 * are rendered. Spread it on the control:
 *
 * ```tsx
 * <input {...register('email')} {...getFieldControlProps({ id, hasError: Boolean(message) })} />
 * ```
 */
export function getFieldControlProps({
  id,
  hasHint = false,
  hasError = false,
  invalid = hasError,
  required = false,
}: FieldControlOptions): FieldControlProps {
  const ids = getFieldIds(id);
  const describedBy = [hasHint && ids.hint, hasError && ids.error].filter(Boolean).join(' ');

  return {
    id,
    'aria-invalid': invalid,
    'aria-describedby': describedBy || undefined,
    'aria-required': required || undefined,
  };
}
