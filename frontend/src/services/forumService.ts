import { MOCK_POSTS, type MockPost } from '@/constants/posts';

export async function fetchPosts(): Promise<MockPost[]> {
  // TODO: replace with real API call when backend is ready
  // const res = await fetch('/api/posts');
  // if (!res.ok) throw new Error('Failed to fetch posts');
  // return res.json();
  return Promise.resolve(MOCK_POSTS);
}
