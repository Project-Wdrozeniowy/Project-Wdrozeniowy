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
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-slate-700"
    >
      {icon}
      {label}
    </button>
  );
}
