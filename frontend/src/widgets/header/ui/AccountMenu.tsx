import { useEffect, useId, useRef, useState } from 'react';
import type { FocusEvent, KeyboardEvent } from 'react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn';
import { UserIcon } from '@/shared/ui/icons';
import { ACCOUNT_MENU_LABEL } from './header.const';
import type { UserProfileDto as UserProfile } from '@/shared/api/generated/models/userProfileDto.dto';

const ITEM_CLASS =
  'block w-full text-left px-3 py-2 text-sm text-fg hover:bg-raised focus-visible:outline-2 focus-visible:outline-blue-500';

interface AccountMenuProps {
  isAuthenticated: boolean;
  user: UserProfile | null;
  logout: () => void;
  /** Extra classes of the wrapper, e.g. to hide it where another control does its job. */
  className?: string;
}

/**
 * The account links of the top bar, behind the user icon at every width: the text links they
 * replace did not fit between 768px and 1000px. A disclosure, not an ARIA menu: a button that shows
 * a short list of links.
 */
export default function AccountMenu({
  isAuthenticated,
  user,
  logout,
  className,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // A tap or click outside closes it. Touch browsers (Safari) do not focus a tapped button, so the
  // blur event alone cannot tell a tap outside from a tap on one of the items.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  function close() {
    setOpen(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape' && open) {
      close();
      buttonRef.current?.focus();
    }
  }

  // Keyboard users tabbing past the last item. A blur with no target (touch) is not an answer.
  function handleBlur(event: FocusEvent<HTMLDivElement>) {
    if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) close();
  }

  return (
    <div
      ref={containerRef}
      className={cn('relative', className)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
    >
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={ACCOUNT_MENU_LABEL}
        className="p-2 rounded text-fg hover:bg-raised transition-colors focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <UserIcon />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-line bg-surface shadow-lg py-1 z-50"
        >
          {isAuthenticated ? (
            <>
              {user && (
                <p className="px-3 py-2 text-xs text-fg-subtle truncate">
                  Signed in as {user.displayName ?? user.username}
                </p>
              )}
              <Link to="/profile" onClick={close} className={ITEM_CLASS}>
                Profile
              </Link>
              <Link to="/settings" onClick={close} className={ITEM_CLASS}>
                Settings
              </Link>
              <button
                type="button"
                onClick={() => {
                  close();
                  logout();
                }}
                className={ITEM_CLASS}
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" onClick={close} className={ITEM_CLASS}>
                Sign in
              </Link>
              <Link to="/register" onClick={close} className={ITEM_CLASS}>
                Sign up
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  );
}
