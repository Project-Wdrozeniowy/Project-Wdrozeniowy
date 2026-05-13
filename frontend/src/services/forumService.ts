import { MOCK_POSTS } from '@/constants/posts';
import type { Post } from '@/types';

export async function fetchPosts(): Promise<Post[]> {
  // TODO: replace with real API call when backend is ready
  // const res = await fetch('/api/posts');
  // if (!res.ok) throw new Error('Failed to fetch posts');
  // return res.json();
  return Promise.resolve(MOCK_POSTS);
}
