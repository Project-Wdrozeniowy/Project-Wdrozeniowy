import type { Post } from '@/types';

export async function fetchPosts(): Promise<Post[]> {
  const res = await fetch('/api/posts');
  if (!res.ok) throw new Error('Failed to fetch posts');
  return res.json();
}
