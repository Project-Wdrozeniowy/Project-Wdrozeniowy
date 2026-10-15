import { z } from 'zod';
import {
  CONTENT_MAX_LENGTH,
  CREATE_POST_ERRORS,
  MAX_TAGS,
  TITLE_MAX_LENGTH,
} from '@/features/create-post/createPost.const';

/** `categoryId` is the select's value: an empty string means nothing is chosen yet. */
export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, CREATE_POST_ERRORS.titleRequired)
    .max(TITLE_MAX_LENGTH, CREATE_POST_ERRORS.titleTooLong),
  categoryId: z.string().min(1, CREATE_POST_ERRORS.categoryRequired),
  content: z
    .string()
    .trim()
    .min(1, CREATE_POST_ERRORS.contentRequired)
    .max(CONTENT_MAX_LENGTH, CREATE_POST_ERRORS.contentTooLong),
  tags: z.array(z.string()).max(MAX_TAGS, CREATE_POST_ERRORS.tagsTooMany),
});

export type CreatePostFormData = z.infer<typeof createPostSchema>;
