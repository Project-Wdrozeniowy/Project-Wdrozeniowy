import { Link } from 'react-router';

interface ActionLinkProps {
  icon: React.ReactNode;
  label: string;
  to: string;
  /** For a link within the same page: do not add a history entry per click. */
  replace?: boolean;
}

/** An action that goes somewhere (for example to a post's comments), looking like ActionButton. */
export default function ActionLink({ icon, label, to, replace }: ActionLinkProps) {
  return (
    <Link
      to={to}
      replace={replace}
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-fg text-sm font-semibold transition-colors hover:bg-raised focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      {icon}
      {label}
    </Link>
  );
}
