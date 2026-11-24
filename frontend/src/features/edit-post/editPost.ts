import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';
import type { UpdatePostRequest } from '@/shared/api/generated/models/updatePostRequest.dto';
import { TITLE_MAX_LENGTH, CONTENT_MAX_LENGTH } from '@/shared/constants/postText.const';
import { apiErrorStatus } from '@/shared/api/client/apiError';

export type PostText = Pick<PostDto, 'title' | 'content'>;
export const POST_TEXT_FIELDS = ['title', 'content'] as const;
export function canEditPost(post: PostDto, user?: MyProfileDto): boolean {
  return (
    user?.id === post.author.id &&
    (post.status === 'PUBLISHED' ||
      post.status === 'DRAFT' ||
      (post.status === 'LOCKED' && ['ADMIN', 'MODERATOR'].includes(user.role)))
  );
}
export function buildEditPostRequest(values: PostText, initial: PostText): UpdatePostRequest {
  const request: UpdatePostRequest = {};
  for (const field of POST_TEXT_FIELDS)
    if (values[field] !== initial[field]) request[field] = values[field];
  return request;
}
export function validatePostText(
  values: PostText,
  initial: PostText
): Partial<Record<keyof PostText, string>> {
  const errors: Partial<Record<keyof PostText, string>> = {};
  for (const field of POST_TEXT_FIELDS) {
    if (values[field] === initial[field]) continue;
    const label = field === 'title' ? 'Title' : 'Body';
    const max = field === 'title' ? TITLE_MAX_LENGTH : CONTENT_MAX_LENGTH;
    if (!values[field].trim()) errors[field] = `${label} is required`;
    else if (values[field].length > max)
      errors[field] = `${label} must be at most ${max} characters`;
  }
  return errors;
}

export function editPostError(error: unknown): {
  fields: Partial<Record<keyof PostText, string>>;
  message?: string;
} {
  const status = apiErrorStatus(error);
  if (status === 400) {
    const data = (error as { response?: { data?: unknown } }).response?.data;
    const fields: Partial<Record<keyof PostText, string>> = {};
    if (
      data &&
      typeof data === 'object' &&
      'errors' in data &&
      data.errors &&
      typeof data.errors === 'object'
    ) {
      for (const field of POST_TEXT_FIELDS)
        if (field in data.errors)
          fields[field] = `Check the ${field === 'title' ? 'title' : 'body'} and try again.`;
    }
    if (Object.keys(fields).length) return { fields };
  }
  const messages: Record<number, string> = {
    401: 'Your session ended. Sign in again to edit this post.',
    403: 'This change was not allowed. Check your access and try again.',
    404: 'This post is no longer available for editing.',
    429: 'Too many requests. Wait a moment, then try again.',
  };
  return {
    fields: {},
    message: messages[status ?? 0] ?? 'We could not save your changes. Please try again.',
  };
}
