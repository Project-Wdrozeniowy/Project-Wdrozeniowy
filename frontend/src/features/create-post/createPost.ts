import {
  CATEGORY_NOT_FOUND_MESSAGE,
  CREATE_POST_ERROR_MESSAGE,
  CREATE_POST_FORBIDDEN_MESSAGE,
  CREATE_POST_ERRORS,
  CREATE_POST_FIELDS,
  CREATE_POST_SERVER_FIELD_ERRORS,
  MAX_TAGS,
  TAG_MAX_LENGTH,
  TAG_PATTERN,
} from '@/features/create-post/createPost.const';
import type { CreatePostField } from '@/features/create-post/createPost.const';
import type { CreatePostFormData } from '@/features/create-post/createPost.schema';
import { apiErrorStatus } from '@/shared/api/client/apiError';
import type { ProblemDetail } from '@/shared/api/client/problem.dto';
import type { CreatePostRequest } from '@/shared/api/forum/post.dto';

/** The stored form of a tag: no leading `#`, lower case (the server stores tags lower-case). */
export function normalizeTag(raw: string): string {
  return raw.trim().replace(/^#+/, '').toLowerCase();
}

export type AddTagResult =
  | { tags: string[]; error?: undefined }
  | { tags: string[]; error: string };

/** Adds one typed tag. Blank input is ignored; an invalid tag is rejected with a message. */
export function addTag(tags: string[], raw: string): AddTagResult {
  const tag = normalizeTag(raw);
  if (tag === '') return { tags };
  if (tags.includes(tag)) return { tags, error: CREATE_POST_ERRORS.tagDuplicate };
  if (tags.length >= MAX_TAGS) return { tags, error: CREATE_POST_ERRORS.tagsTooMany };
  if (tag.length > TAG_MAX_LENGTH) return { tags, error: CREATE_POST_ERRORS.tagTooLong };
  if (!TAG_PATTERN.test(tag)) return { tags, error: CREATE_POST_ERRORS.tagInvalid };
  return { tags: [...tags, tag] };
}

export function removeTag(tags: string[], tag: string): string[] {
  return tags.filter((existing) => existing !== tag);
}

export function emptyFormValues(): CreatePostFormData {
  return { title: '', categoryId: '', content: '', tags: [] };
}

/** The POST body. Text is trimmed; empty `tags` is omitted. */
export function buildCreatePostRequest(values: CreatePostFormData): CreatePostRequest {
  const request: CreatePostRequest = {
    title: values.title.trim(),
    content: values.content.trim(),
    categoryId: Number(values.categoryId),
  };
  if (values.tags.length > 0) request.tags = values.tags;
  return request;
}

export interface CreatePostError {
  fields: Partial<Record<CreatePostField, string>>;
  /** A message for the whole form, set when no field is to blame. */
  form?: string;
}

function isCreatePostField(key: string): key is CreatePostField {
  return (CREATE_POST_FIELDS as readonly string[]).includes(key);
}

/**
 * Turns a failed publish into messages written by us; the server's own texts are never shown.
 * Field keys from the API may carry an index (`tags[0]`): they map to the field's name.
 */
export function getCreatePostError(error: unknown): CreatePostError {
  const status = apiErrorStatus(error);

  if (status === 403) return { fields: {}, form: CREATE_POST_FORBIDDEN_MESSAGE };

  if (status === 404) return { fields: { categoryId: CATEGORY_NOT_FOUND_MESSAGE } };

  if (status === 400) {
    const body = (error as { response?: { data?: ProblemDetail } }).response?.data;
    const fields: CreatePostError['fields'] = {};
    for (const key of Object.keys(body?.errors ?? {})) {
      const name = key.replace(/\[\d+\]$/, '');
      if (isCreatePostField(name)) fields[name] = CREATE_POST_SERVER_FIELD_ERRORS[name];
    }
    if (Object.keys(fields).length > 0) return { fields };
  }
  return { fields: {}, form: CREATE_POST_ERROR_MESSAGE };
}
