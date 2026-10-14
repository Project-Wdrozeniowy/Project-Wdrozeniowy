export default function FormField({
  label,
  hint,
  id,
  error,
  children,
}: {
  label: string;
  hint?: string;
  id?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-gray-900 font-semibold text-sm">
        {label}
      </label>
      {children}
      {hint && (
        <p id={id ? `${id}-hint` : undefined} className="text-gray-500 text-xs">
          {hint}
        </p>
      )}
      {error && (
        <p id={id ? `${id}-error` : undefined} role="alert" className="text-red-500 text-xs">
          {error}
        </p>
      )}
    </div>
  );
}
