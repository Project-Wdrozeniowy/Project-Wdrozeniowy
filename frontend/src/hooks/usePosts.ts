import { useQuery } from '@tanstack/react-query';
import { MOCK_POSTS } from '@/constants/posts';

// TODO: replace with postService.list() once PostCard is migrated to PostSummary
export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: () => Promise.resolve(MOCK_POSTS),
  });
}
