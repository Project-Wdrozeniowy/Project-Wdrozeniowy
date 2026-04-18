'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useStore } from '@/store';

export default function Header() {
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useStore();

  const navLinks = [
    { href: '/', label: 'Home' },
    { href: '/dashboard', label: 'Analytics' },
  ];

  return (
    <header className="h-16 bg-slate-800 sticky top-0 z-50 flex items-center px-4 lg:px-6">
      <div className="w-full max-w-[1130px] mx-auto flex items-center justify-between gap-4">
        {/* Left: logo + nav */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <OrbitaLogo />
            <span className="text-white font-semibold text-xl hidden sm:block">
              Orbita
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded text-sm font-semibold transition-colors ${
                    active
                      ? 'bg-slate-700 text-gray-50'
                      : 'text-gray-50 hover:bg-slate-700'
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right: search + actions */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <div className="relative hidden sm:block">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="search"
              placeholder="Search posts..."
              className="bg-slate-700 text-gray-50 placeholder-slate-400 rounded text-sm pl-9 pr-3 py-2 w-56 focus:outline-none focus:ring-1 focus:ring-blue-600"
            />
          </div>

          {/* Trending */}
          <button
            aria-label="Trending"
            className="p-2 rounded text-gray-50 hover:bg-slate-700 transition-colors"
          >
            <TrendingIcon />
          </button>

          {/* Notifications */}
          {isAuthenticated && (
            <button
              aria-label="Notifications"
              className="p-2 rounded text-gray-50 hover:bg-slate-700 transition-colors"
            >
              <BellIcon />
            </button>
          )}

          {/* Auth */}
          {isAuthenticated ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 hidden sm:block">
                {user?.displayName ?? user?.username}
              </span>
              <button
                onClick={logout}
                className="text-sm text-slate-400 hover:text-gray-50 transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm text-gray-50 hover:text-slate-300 transition-colors px-3 py-1.5"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors"
              >
                Sign up
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

function OrbitaLogo() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden>
      <circle cx="16" cy="16" r="13" stroke="#6366f1" strokeWidth="1.2" opacity="0.15" />
      <circle cx="16" cy="16" r="10" stroke="#6366f1" strokeWidth="1.2" opacity="0.25" />
      <circle cx="16" cy="16" r="7" fill="#6366f1" opacity="0.2" />
      <circle cx="16" cy="16" r="4.5" fill="#6366f1" opacity="0.4" />
      <circle cx="16" cy="16" r="2.5" fill="#6366f1" />
      <circle cx="16" cy="7" r="1.5" fill="#3b82f6" />
      <circle cx="23" cy="11" r="1" fill="#60a5fa" />
      <circle cx="23" cy="21" r="1.5" fill="#8b5cf6" />
      <circle cx="16" cy="25" r="1" fill="#a78bfa" />
      <circle cx="9" cy="21" r="1.5" fill="#ec4899" />
      <circle cx="9" cy="11" r="1" fill="#f97316" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );
}

function TrendingIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

function BellIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}
