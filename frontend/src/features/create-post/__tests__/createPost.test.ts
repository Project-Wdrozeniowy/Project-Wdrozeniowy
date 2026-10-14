import { AxiosError } from 'axios';
import {
  addTag,
  buildCreatePostRequest,
  getCreatePostError,
  normalizeTag,
  removeTag,
} from '../createPost';
import {
  CREATE_POST_ERRORS,
  CREATE_POST_FORBIDDEN_MESSAGE,
  MAX_TAGS,
  TAG_MAX_LENGTH,
} from '../createPost.const';
import { createPostSchema } from '../createPost.schema';

function httpError(status: number, data?: unknown) {
  return new AxiosError('failed', 'ERR', undefined, undefined, {
    status,
    data,
  } as never);
}

describe('normalizeTag', () => {
  it('trims, drops leading # and lower-cases', () => {
    expect(normalizeTag('  #React ')).toBe('react');
    expect(normalizeTag('##Next-JS')).toBe('next-js');
  });
});

describe('addTag', () => {
  it('adds a normalized tag', () => {
    expect(addTag(['a'], ' #B ')).toEqual({ tags: ['a', 'b'] });
  });

  it('ignores blank input without an error', () => {
    expect(addTag(['a'], '  #  ')).toEqual({ tags: ['a'] });
  });

  it('rejects a duplicate', () => {
    expect(addTag(['react'], 'React').error).toBe(CREATE_POST_ERRORS.tagDuplicate);
  });

  it('rejects the sixth tag', () => {
    const tags = Array.from({ length: MAX_TAGS }, (_, i) => `t${i}`);
    const result = addTag(tags, 'extra');
    expect(result.error).toBe(CREATE_POST_ERRORS.tagsTooMany);
    expect(result.tags).toBe(tags);
  });

  it('rejects a tag longer than the limit but accepts one of exactly the limit', () => {
    expect(addTag([], 'a'.repeat(TAG_MAX_LENGTH + 1)).error).toBe(CREATE_POST_ERRORS.tagTooLong);
    expect(addTag([], 'a'.repeat(TAG_MAX_LENGTH)).error).toBeUndefined();
  });

  it.each(['has space', 'a--b', '-a', 'a-', 'a_b', 'ä'])('rejects %s', (raw) => {
    expect(addTag([], raw).error).toBe(CREATE_POST_ERRORS.tagInvalid);
  });

  it('accepts hyphenated words', () => {
    expect(addTag([], 'open-source').tags).toEqual(['open-source']);
  });
});

describe('removeTag', () => {
  it('removes only that tag', () => {
    expect(removeTag(['a', 'b'], 'a')).toEqual(['b']);
  });
});

describe('createPostSchema', () => {
  const valid = { title: ' Hi ', categoryId: '3', content: 'Body', tags: [] };

  it('accepts a valid form', () => {
    expect(createPostSchema.safeParse(valid).success).toBe(true);
  });

  it('requires title, category and body', () => {
    const result = createPostSchema.safeParse({
      ...valid,
      title: '  ',
      categoryId: '',
      content: '',
    });
    const messages = result.success ? [] : result.error.issues.map((i) => i.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        CREATE_POST_ERRORS.titleRequired,
        CREATE_POST_ERRORS.categoryRequired,
        CREATE_POST_ERRORS.contentRequired,
      ])
    );
  });

  it('enforces the title and body limits on the trimmed text', () => {
    expect(createPostSchema.safeParse({ ...valid, title: 'a'.repeat(120) }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...valid, title: 'a'.repeat(121) }).success).toBe(false);
    expect(createPostSchema.safeParse({ ...valid, content: 'a'.repeat(5000) }).success).toBe(true);
    expect(createPostSchema.safeParse({ ...valid, content: 'a'.repeat(5001) }).success).toBe(false);
  });

  it('allows at most five tags', () => {
    expect(
      createPostSchema.safeParse({ ...valid, tags: ['1', '2', '3', '4', '5', '6'] }).success
    ).toBe(false);
  });
});

describe('buildCreatePostRequest', () => {
  it('trims text, converts the category id and omits empty tags', () => {
    expect(
      buildCreatePostRequest({ title: ' T ', categoryId: '7', content: ' C ', tags: [] })
    ).toEqual({ title: 'T', content: 'C', categoryId: 7 });
  });

  it('includes tags when present', () => {
    expect(
      buildCreatePostRequest({ title: 'T', categoryId: '7', content: 'C', tags: ['a'] }).tags
    ).toEqual(['a']);
  });
});

describe('getCreatePostError', () => {
  it('explains a 403', () => {
    expect(getCreatePostError(httpError(403)).form).toBe(CREATE_POST_FORBIDDEN_MESSAGE);
  });

  it('maps 404 to the category field', () => {
    expect(getCreatePostError(httpError(404)).fields.categoryId).toBeDefined();
  });

  it('maps 400 field errors, including indexed keys, to our own wording', () => {
    const error = httpError(400, {
      status: 400,
      errors: { 'tags[0]': 'must match', title: 'size' },
    });
    const { fields, form } = getCreatePostError(error);
    expect(fields.tags).toBe(CREATE_POST_ERRORS.tagInvalid);
    expect(fields.title).toBe(CREATE_POST_ERRORS.titleTooLong);
    expect(form).toBeUndefined();
  });

  it('falls back to a form message for unknown 400 keys, 5xx and network errors', () => {
    expect(
      getCreatePostError(httpError(400, { status: 400, errors: { x: 'y' } })).form
    ).toBeDefined();
    expect(getCreatePostError(httpError(500)).form).toBeDefined();
    expect(getCreatePostError(new Error('network')).form).toBeDefined();
  });
});
