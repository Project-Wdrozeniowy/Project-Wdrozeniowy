interface ActionButtonProps {
  icon: React.ReactNode;
  label: string;
  disabled?: boolean;
  /** Tooltip, used to explain why the button is disabled. */
  title?: string;
}

export default function ActionButton({ icon, label, disabled = false, title }: ActionButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      title={title}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-fg text-sm font-semibold transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
    >
      {icon}
      {label}
    </button>
  );
}
