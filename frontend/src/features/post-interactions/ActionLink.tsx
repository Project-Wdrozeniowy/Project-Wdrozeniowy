import { Link } from 'react-router';

interface ActionLinkProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  /**
   * What the link belongs to, for a label that is the same on every card ("on <post title>").
   * The accessible name is the label followed by this, so it always starts with the visible text.
   */
  context?: string;
  /** For a link within the same page: do not add a history entry per click. */
  replace?: boolean;
}

/** An action that goes somewhere (for example to a post's comments), looking like ActionButton. */
export default function ActionLink({ icon, label, to, replace, context }: ActionLinkProps) {
  return (
    <Link
      to={to}
      replace={replace}
      aria-label={context ? `${label} ${context}` : undefined}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-fg text-sm font-semibold transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      {icon}
      {label}
    </Link>
  );
}
