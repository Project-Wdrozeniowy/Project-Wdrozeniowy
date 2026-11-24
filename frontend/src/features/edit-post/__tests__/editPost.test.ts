import { buildEditPostRequest, canEditPost, validatePostText, editPostError } from '../editPost';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import type { MyProfileDto } from '@/shared/api/generated/models/myProfileDto.dto';

const initial = { title: 'Title', content: '  Markdown  \n' };
const post = { author: { id: 1 }, status: 'PUBLISHED' } as PostDto;
const user = { id: 1, role: 'USER' } as MyProfileDto;

it.each([401, 403, 404, 429, 500, undefined])(
  'safely describes a %s rejection without showing server text',
  (status) => {
    const result = editPostError({
      isAxiosError: true,
      response: { status, data: { detail: 'secret' } },
    });
    expect(result.message).toBeTruthy();
    expect(result.message).not.toContain('secret');
  }
);

it.each([null, {}, { errors: null }, { errors: { categoryId: 'secret' } }])(
  'does not trust malformed or unrelated validation fields: %j',
  (data) => {
    expect(editPostError({ isAxiosError: true, response: { status: 400, data } })).toEqual({
      fields: {},
      message: 'We could not save your changes. Please try again.',
    });
  }
);

it('maps only known field keys from validation errors', () => {
  expect(
    editPostError({
      isAxiosError: true,
      response: { status: 400, data: { errors: { content: 'secret', unknown: 'secret' } } },
    })
  ).toEqual({ fields: { content: 'Check the body and try again.' } });
});

it('sends only changed fields and preserves Markdown whitespace', () => {
  expect(buildEditPostRequest(initial, initial)).toEqual({});
  expect(buildEditPostRequest({ ...initial, title: 'Correction' }, initial)).toEqual({
    title: 'Correction',
  });
  expect(buildEditPostRequest({ ...initial, content: '  New  \n' }, initial)).toEqual({
    content: '  New  \n',
  });
  expect(buildEditPostRequest({ title: 'New', content: 'Body' }, initial)).toEqual({
    title: 'New',
    content: 'Body',
  });
});

it('enforces project limits only on changed fields, without truncating existing text', () => {
  expect(validatePostText({ title: '', content: ' ' }, initial)).toEqual({
    title: 'Title is required',
    content: 'Body is required',
  });
  expect(validatePostText({ title: 'x'.repeat(121), content: 'x'.repeat(5001) }, initial)).toEqual({
    title: 'Title must be at most 120 characters',
    content: 'Body must be at most 5000 characters',
  });
  expect(validatePostText({ title: 'x'.repeat(120), content: 'x'.repeat(5000) }, initial)).toEqual(
    {}
  );
  const long = { title: 'Old', content: 'x'.repeat(6000) };
  expect(validatePostText({ ...long, title: 'New' }, long)).toEqual({});
});

it('offers only own edits allowed by the existing backend rules', () => {
  expect(canEditPost(post)).toBe(false);
  expect(canEditPost(post, { ...user, id: 2 })).toBe(false);
  expect(canEditPost(post, user)).toBe(true);
  expect(canEditPost({ ...post, status: 'DRAFT' }, user)).toBe(true);
  expect(canEditPost({ ...post, status: 'DELETED' }, user)).toBe(false);
  expect(canEditPost({ ...post, status: 'LOCKED' }, user)).toBe(false);
  expect(canEditPost({ ...post, status: 'LOCKED' }, { ...user, role: 'MODERATOR' })).toBe(true);
  expect(canEditPost({ ...post, status: 'LOCKED' }, { ...user, role: 'ADMIN' })).toBe(true);
});
