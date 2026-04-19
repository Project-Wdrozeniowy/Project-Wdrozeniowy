import { useQuery } from '@tanstack/react-query';
import { fetchPosts } from '@/services/forumService';

export function usePosts() {
  return useQuery({
    queryKey: ['posts'],
    queryFn: fetchPosts,
  });
}
