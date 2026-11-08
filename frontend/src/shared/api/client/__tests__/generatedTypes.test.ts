import { expectTypeOf } from 'vitest';
import type { AuthRequest } from '@/shared/api/generated/models/authRequest.dto';
import type { CreatePostRequest } from '@/shared/api/generated/models/createPostRequest.dto';
import type { PostDto } from '@/shared/api/generated/models/postDto.dto';
import type { PostSummaryDto } from '@/shared/api/generated/models/postSummaryDto.dto';
import type { CategoryDto } from '@/shared/api/generated/models/categoryDto.dto';
import type { ListPostsParams } from '@/shared/api/generated/models/listPostsParams.dto';
import type { NotificationDto } from '@/shared/api/generated/models/notificationDto.dto';
import type { PagedResponseNotificationDto } from '@/shared/api/generated/models/pagedResponseNotificationDto.dto';
import type { GetActivityTrendParams } from '@/shared/api/generated/models/getActivityTrendParams.dto';
import type { logout, login } from '@/shared/api/generated/orbita.api';

it('keeps required request fields, enums, nullable responses and cookie-only operations typed', () => {
  expectTypeOf<PostSummaryDto['category']>().toEqualTypeOf<CategoryDto | null>();
  expectTypeOf<PostDto['subscribed']>().toEqualTypeOf<boolean>();
  expectTypeOf<ReturnType<typeof logout>>().toEqualTypeOf<Promise<void>>();
  expectTypeOf<ReturnType<typeof login>>().toEqualTypeOf<Promise<void>>();
  expectTypeOf<NotificationDto['message']>().toEqualTypeOf<string | null>();
  expectTypeOf<PagedResponseNotificationDto['content'][number]>().toEqualTypeOf<NotificationDto>();
  // @ts-expect-error Password is mandatory in the backend contract.
  const invalidLogin: AuthRequest = { username: 'alice' };
  // @ts-expect-error A post must reference a category.
  const post: CreatePostRequest = { title: 'Title', content: 'Body' };
  // @ts-expect-error Only the backend's sort values are allowed.
  const params: ListPostsParams = { sort: 'random' };
  // @ts-expect-error Analytics accepts only metrics from the published contract.
  const trend: GetActivityTrendParams = { metric: 'visitors' };
  void [invalidLogin, post, params, trend];
});
