import {
  PROFILE_POSTS_EMPTY_TEXT,
  PROFILE_POSTS_ERROR_TEXT,
  PROFILE_POSTS_REFRESH_ERROR_TEXT,
  PROFILE_POSTS_TITLE,
} from '@/pages/profile/config/profileView.const';
import { uniquePosts } from '@/pages/profile/lib/profilePosts';
import { getLoadPhase } from '@/shared/lib/loadPhase';
import { useAuthorPosts } from '@/shared/api/forum/useAuthorPosts';
import PanelError from '@/shared/ui/PanelError';
import { PostCard, toPostCardData } from '@/widgets/post-feed';
import PostsSkeleton from './PostsSkeleton';

interface ProfilePostsProps {
  /** Empty while the profile itself is still loading. */
  username: string;
}

/** The published posts of the user, newest first, loaded a page at a time. */
export default function ProfilePosts({ username }: ProfilePostsProps) {
  const query = useAuthorPosts(username);
  const posts = uniquePosts(query.data?.pages.flatMap((page) => page.content) ?? []);

  const phase = getLoadPhase(query);

  let body;
  if (phase === 'failed' || phase === 'retrying') {
    // A retry keeps the error on screen, so the keyboard user keeps their place.
    body = (
      <PanelError
        message={PROFILE_POSTS_ERROR_TEXT}
        onRetry={() => query.refetch()}
        retrying={phase === 'retrying'}
      />
    );
  } else if (username === '' || query.isPending) {
    body = <PostsSkeleton />;
  } else if (posts.length === 0) {
    body = <p className="text-fg-subtle text-sm">{PROFILE_POSTS_EMPTY_TEXT}</p>;
  } else {
    body = (
      <>
        <ul className="flex flex-col gap-3 list-none m-0 p-0">
          {posts.map((post) => (
            <li key={post.id}>
              <PostCard post={toPostCardData(post)} />
            </li>
          ))}
        </ul>
        {query.isRefetchError && (
          <p role="alert" className="text-warning text-sm">
            {PROFILE_POSTS_REFRESH_ERROR_TEXT}
          </p>
        )}
        {query.isFetchNextPageError && (
          <p role="alert" className="text-warning text-sm">
            {PROFILE_POSTS_ERROR_TEXT}
          </p>
        )}
        {query.hasNextPage && (
          <button
            type="button"
            onClick={() => {
              if (!query.isFetchingNextPage) void query.fetchNextPage();
            }}
            aria-disabled={query.isFetchingNextPage}
            className="self-center rounded border border-line-strong px-4 py-2 text-sm font-semibold text-fg-soft hover:bg-raised aria-disabled:opacity-60 aria-disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-500"
          >
            {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
          </button>
        )}
      </>
    );
  }

  return (
    <section aria-label={PROFILE_POSTS_TITLE} className="flex flex-col gap-3">
      {body}
    </section>
  );
}
