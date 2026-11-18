import { QueryClient, QueryObserver } from '@tanstack/react-query';
import { getListPostsQueryKey } from '@/shared/api/generated/orbita.api';
import { orvalTransport } from '@/shared/api/client/orvalTransport';
import { getPublishPostMutationOptions } from '@/shared/api/forum/usePublishPost';

vi.mock('@/shared/api/client/orvalTransport', () => ({ orvalTransport: vi.fn() }));

const post = { id: 1, slug: 'created' };
const variables = { data: { title: 'Title', content: 'Body', categoryId: 1 } };
let client: QueryClient;

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.mocked(orvalTransport).mockResolvedValue(post);
});

afterEach(() => {
  client.clear();
  vi.clearAllMocks();
});

it('keeps publication pending until the caller onSuccess completes and forwards its context', async () => {
  let finish!: () => void;
  const held = new Promise<void>((resolve) => (finish = resolve));
  const context = { draftId: 'draft-1' };
  const onSuccess = vi.fn(() => held);
  const mutation = client.getMutationCache().build(
    client,
    getPublishPostMutationOptions(client, {
      mutation: { onMutate: () => context, onSuccess },
    })
  );
  let completed = false;
  const pending = mutation.execute(variables).then((result) => {
    completed = true;
    return result;
  });
  try {
    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(onSuccess).toHaveBeenCalledWith(
      post,
      variables,
      context,
      expect.objectContaining({ client })
    );
    expect(mutation.state.status).toBe('pending');
    expect(completed).toBe(false);
  } finally {
    finish();
  }
  await expect(pending).resolves.toEqual(post);
  expect(mutation.state.status).toBe('success');
});

it('routes an async onSuccess rejection through the mutation error lifecycle', async () => {
  let fail!: (error: Error) => void;
  const held = new Promise<void>((_, reject) => (fail = reject));
  const onSuccess = vi.fn(() => held);
  const onError = vi.fn();
  const mutation = client
    .getMutationCache()
    .build(client, getPublishPostMutationOptions(client, { mutation: { onSuccess, onError } }));
  const error = new Error('Post-publication callback failed');
  const pending = expect(mutation.execute(variables)).rejects.toBe(error);
  await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
  fail(error);
  await pending;
  expect(mutation.state.status).toBe('error');
  expect(onError).toHaveBeenCalledWith(
    error,
    variables,
    undefined,
    expect.objectContaining({ client })
  );
});

it('finishes publication while an invalidated active feed is still refetching', async () => {
  let finishRefetch!: () => void;
  const page = { content: [] };
  const refetch = vi.fn(
    () => new Promise<typeof page>((resolve) => (finishRefetch = () => resolve(page)))
  );
  const key = getListPostsQueryKey({ page: 0 });
  const unsubscribe = new QueryObserver(client, {
    queryKey: key,
    queryFn: refetch,
    initialData: page,
    staleTime: Infinity,
  }).subscribe(() => {});
  try {
    const mutation = client.getMutationCache().build(client, getPublishPostMutationOptions(client));
    await expect(mutation.execute(variables)).resolves.toEqual(post);
    expect(refetch).toHaveBeenCalledTimes(1);
    expect(client.getQueryState(key)?.fetchStatus).toBe('fetching');
    expect(mutation.state.status).toBe('success');
  } finally {
    finishRefetch?.();
    unsubscribe();
  }
});
