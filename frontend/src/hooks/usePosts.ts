import { useQuery } from '@tanstack/react-query';
import { MOCK_POSTS } from '@/constants/posts';
import { mockToPostCardData } from '@/lib/postCard';

// Home page fixtures only. The forum feed uses useForumPosts; the home page moves to the API in PWDRZ-111.
export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: () => Promise.resolve(MOCK_POSTS.map(mockToPostCardData)),
  });
}
