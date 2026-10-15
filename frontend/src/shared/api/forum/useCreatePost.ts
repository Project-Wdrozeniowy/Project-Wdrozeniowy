import { useMutation, useQueryClient } from '@tanstack/react-query';
import { postService } from '@/shared/api/forum/forumClient';
import type { CreatePostRequest } from '@/shared/api/forum/post.dto';

/** Lets other components (the dialog) tell whether a publish is running. */
export const createPostMutationKey = ['create-post'] as const;

export function useCreatePost() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: createPostMutationKey,
    // The form maps failures to its own messages; the global toast would print server text.
    mutationFn: (request: CreatePostRequest) =>
      postService.create(request, { skipErrorToast: true }),
    onSuccess: () => {
      // Cached feed pages (forum and home share them) may now be missing the new post (it sorts first). Not awaited: the
      // form must report success as soon as the post exists, not after the feeds refetch.
      void queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
    },
  });
}
