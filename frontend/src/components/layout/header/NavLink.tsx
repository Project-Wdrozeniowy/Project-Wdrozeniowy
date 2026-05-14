import Link from 'next/link';
import { cn } from '@/lib/cn';

export default function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'px-3 py-1.5 rounded text-sm font-semibold transition-colors',
        active ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'
      )}
    >
      {children}
    </Link>
  );
}
