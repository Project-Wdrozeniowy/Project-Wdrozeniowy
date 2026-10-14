'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { CreatePostDialog } from '@/features/create-post/CreatePostDialog';
import { useStore } from '@/store';

/** Opens the create-post dialog. A guest is sent to sign in first. */
export function CreatePostButton() {
  const router = useRouter();
  const isAuthenticated = useStore((state) => state.isAuthenticated);
  // Until the session is restored a signed-in user would look like a guest.
  const isInitialized = useStore((state) => state.isInitialized);
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        disabled={!isInitialized}
        onClick={() => (isAuthenticated ? setOpen(true) : router.push('/login'))}
        className="flex shrink-0 items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span aria-hidden="true">+</span>
        <span>Create Post</span>
      </button>
      <CreatePostDialog open={open} onClose={() => setOpen(false)} />
    </>
  );
}
