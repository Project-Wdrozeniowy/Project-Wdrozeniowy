/** Limits of the create-post form. They follow the design and are stricter than the backend's. */
export const TITLE_MAX_LENGTH = 120;
export const CONTENT_MAX_LENGTH = 5000;
export const MAX_TAGS = 5;
export const TAG_MAX_LENGTH = 20;

/** Same rule as the backend: words of letters and digits joined by single hyphens. */
export const TAG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Keys that turn the typed text into a tag. */
export const TAG_SEPARATOR_KEYS = ['Enter', ','] as const;

export const CREATE_POST_FIELDS = ['title', 'categoryId', 'content', 'tags'] as const;
export type CreatePostField = (typeof CREATE_POST_FIELDS)[number];

export const CREATE_POST_ERRORS = {
  titleRequired: 'Title is required',
  titleTooLong: `Title must be at most ${TITLE_MAX_LENGTH} characters`,
  categoryRequired: 'Please select a category',
  contentRequired: 'Body is required',
  contentTooLong: `Body must be at most ${CONTENT_MAX_LENGTH} characters`,
  tagsTooMany: `You can add up to ${MAX_TAGS} tags`,
  tagTooLong: `A tag can be at most ${TAG_MAX_LENGTH} characters`,
  tagInvalid: 'Use only letters, numbers and single hyphens in a tag',
  tagDuplicate: 'This tag is already added',
} as const;

/** What the server can reject, in the words of the form. */
export const CREATE_POST_SERVER_FIELD_ERRORS: Record<CreatePostField, string> = {
  title: CREATE_POST_ERRORS.titleTooLong,
  categoryId: CREATE_POST_ERRORS.categoryRequired,
  content: CREATE_POST_ERRORS.contentTooLong,
  tags: CREATE_POST_ERRORS.tagInvalid,
};

/** The `detail` the API sends with a 400 when `categoryId` does not exist. */
export const CATEGORY_NOT_FOUND_DETAIL = 'Category not found';
export const CATEGORY_NOT_FOUND_MESSAGE =
  'This category no longer exists. Please pick another one.';
export const CREATE_POST_ERROR_MESSAGE = 'We could not publish your post. Please try again.';
export const CATEGORIES_ERROR_MESSAGE = 'We could not load the categories.';
export const CATEGORIES_EMPTY_MESSAGE = 'No categories are available yet.';
