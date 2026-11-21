/** The date formatted with `format`, or `null` for no date or a value that is not a date. */
export function formatDate(value: string | null, format: Intl.DateTimeFormat): string | null {
  if (value === null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : format.format(date);
}
