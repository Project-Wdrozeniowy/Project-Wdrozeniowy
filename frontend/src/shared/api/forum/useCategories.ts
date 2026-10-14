import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/shared/api/forum/forumClient';

export const categoriesQueryKey = ['forum-categories'] as const;

/** Categories a post can be filed under. Hidden ones are left out. */
export function useCategories() {
  return useQuery({
    queryKey: categoriesQueryKey,
    // The form shows its own fixed message; the global toast would print server text.
    queryFn: async () => {
      const categories = await categoryService.list({ skipErrorToast: true });
      return categories.filter((category) => category.visible);
    },
    // Categories rarely change: do not refetch on every dialog open.
    staleTime: 5 * 60 * 1000,
  });
}
