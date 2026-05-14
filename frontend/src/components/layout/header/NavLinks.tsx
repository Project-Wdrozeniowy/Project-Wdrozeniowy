import Link from 'next/link';
import { cn } from '@/lib/cn';

interface NavLink {
  href: string;
  label: string;
}

export default function NavLinks({
  links,
  pathname,
}: {
  links: readonly NavLink[];
  pathname: string;
}) {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {links.map(({ href, label }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition-colors',
              active ? 'bg-slate-700 text-gray-50' : 'text-gray-50 hover:bg-slate-700'
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
