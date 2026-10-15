'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CreatePostDialog } from '@/features/create-post/CreatePostDialog';
import { useStore } from '@/store';

/** Opens the create-post dialog. A guest is sent to sign in first. */
export function CreatePostButton() {
  const router = useRouter();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  const userId = useStore((state) => state.user?.id);
  // Until the session is restored a signed-in user would look like a guest.
  const isInitialized = useStore((state) => state.isInitialized);
  // Remembers whose session opened the dialog: when the user changes (sign-out, another account)
  // the dialog is closed and its form, with any draft, is dropped.
  const userKey = String(userId ?? 'guest');
  const [openFor, setOpenFor] = useState<string | null>(null);
  const [lastUserKey, setLastUserKey] = useState(userKey);
  if (lastUserKey !== userKey) {
    // Signing out and back in must not bring a closed-by-logout dialog back.
    setLastUserKey(userKey);
    setOpenFor(null);
  }
  const open = openFor === userKey;

  return (
    <>
      <button
        type="button"
        disabled={!isInitialized}
        onClick={() => (isAuthenticated ? setOpenFor(userKey) : router.push('/login'))}
        className="flex shrink-0 items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true">+</span>
        <span>Create Post</span>
      </button>
      <CreatePostDialog key={userKey} open={open} onClose={() => setOpenFor(null)} />
    </>
  );
}
