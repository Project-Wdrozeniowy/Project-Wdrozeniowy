import { expectTypeOf } from 'vitest';
import type { AuthRequest } from '@/shared/api/generated/models/authRequest.dto';
import type { CreatePostRequest } from '@/shared/api/generated/models/createPostRequest.dto';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import type { PostSummaryDto } from '@/shared/api/generated/models/postSummaryDto.dto';
import type { CategoryDto } from '@/shared/api/generated/models/categoryDto.dto';
import type { ListPostsParams } from '@/shared/api/generated/models/listPostsParams.dto';
import type { logout, refresh } from '@/shared/api/generated/orbita.api';

it('keeps required request fields, enums, nullable responses and cookie-only operations typed', () => {
  expectTypeOf<PostSummaryDto['category']>().toEqualTypeOf<CategoryDto | null>();
  expectTypeOf<PostDto['subscribed']>().toEqualTypeOf<boolean>();
  expectTypeOf<ReturnType<typeof logout>>().toEqualTypeOf<Promise<void>>();
  expectTypeOf<Parameters<typeof refresh>[0]>().not.toHaveProperty('refreshToken');
  // @ts-expect-error Password is mandatory in the backend contract.
  const login: AuthRequest = { username: 'alice' };
  // @ts-expect-error A post must reference a category.
  const post: CreatePostRequest = { title: 'Title', content: 'Body' };
  // @ts-expect-error Only the backend's sort values are allowed.
  const params: ListPostsParams = { sort: 'random' };
  void [login, post, params];
});
