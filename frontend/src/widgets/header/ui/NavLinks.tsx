import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { isActiveLink } from '@/shared/lib/isActiveLink';
import { pageIcon } from '@/shared/ui/pageIcons';

interface NavLink {
  href: string;
  label: string;
}

interface NavLinksProps {
  links: readonly NavLink[];
  pathname: string;
}

export default function NavLinks({ links, pathname }: NavLinksProps) {
  return (
    <nav className="hidden md:flex items-center gap-1">
      {links.map(({ href, label }) => {
        const active = isActiveLink(pathname, href);
        const Icon = pageIcon(href);
        return (
          <Link
            key={href}
            to={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-blue-500',
              active ? 'bg-raised text-fg' : 'text-fg hover:bg-raised'
            )}
          >
            {Icon && <Icon />}
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
