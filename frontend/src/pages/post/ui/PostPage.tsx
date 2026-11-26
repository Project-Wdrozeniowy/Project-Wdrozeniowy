import { useId, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { useCurrentUser } from '@/shared/api/profile/currentUser';
import { canReadInsights } from '@/pages/post/lib/insightsAccess';
import { CommentSection } from '@/features/post-comments/CommentSection';
import { POST_ERROR_TEXT } from '@/pages/post/config/post.const';
import { isPostNotFound } from '@/pages/post/lib/postView';
import { useScrollToComments } from '@/pages/post/lib/useScrollToComments';
import { usePost } from '@/shared/api/forum/usePost';
import { useRecordPostOpening } from '@/shared/api/forum/useRecordPostOpening';
import PanelError from '@/shared/ui/PanelError';
import PostArticle from './PostArticle';
import PostInsights from './PostInsights';
import PostNotFound from './PostNotFound';
import PostSkeleton from './PostSkeleton';

export default function PostPage() {
  const { slug = '' } = useParams();
  const query = usePost(slug);
  const { hash } = useLocation();
  const viewer = useCurrentUser();
  const identity = `${query.data?.id ?? slug}:${viewer?.id ?? 'guest'}`;
  const [visibility, setVisibility] = useState({ identity, open: false, denied: false });
  if (visibility.identity !== identity) setVisibility({ identity, open: false, denied: false });
  const analyticsId = useId();
  const available =
    Boolean(query.data && canReadInsights(query.data, viewer?.id)) &&
    !(visibility.identity === identity && visibility.denied);
  const analyticsOpen = available && visibility.identity === identity && visibility.open;

  // The "N Comments" links point at #comments, which exists only once the post has loaded: the
  // browser's own scroll to a fragment has already come and gone by then, so scroll here, and keep
  // the comments in place while what loads above them (the insights) changes the page's height.
  useScrollToComments('comments', hash === '#comments' ? (query.data?.id ?? null) : null);

  // The reader opened this post: the platform counts it once, when it is on screen.
  useRecordPostOpening(slug, query.data !== undefined);

  if (slug === '') return <PostNotFound />;

  // A post that was loaded stays on screen even if a later refresh fails, unless the refresh says
  // the post is gone (deleted meanwhile).
  if (query.isError && isPostNotFound(query.error)) return <PostNotFound />;
  if (query.data) {
    return (
      <div className="flex flex-col gap-6">
        <PostArticle
          post={query.data}
          analytics={{
            available,
            open: analyticsOpen,
            targetId: analyticsId,
            onToggle: () => setVisibility({ identity, open: !analyticsOpen, denied: false }),
          }}
        />
        <div id={analyticsId} hidden={!analyticsOpen}>
          {analyticsOpen && (
            <PostInsights
              post={query.data}
              onRefreshPost={() => query.refetch()}
              onUnavailable={() => {
                setVisibility({ identity, open: false, denied: true });
              }}
            />
          )}
        </div>
        {/* The target of the "N Comments" links. */}
        <div id="comments">
          <CommentSection slug={slug} postId={query.data.id} />
        </div>
      </div>
    );
  }

  if (query.isPending) return <PostSkeleton />;
  if (isPostNotFound(query.error)) return <PostNotFound />;
  return (
    <div className="bg-surface rounded-xl p-6 border border-line">
      <PanelError
        message={POST_ERROR_TEXT}
        onRetry={() => query.refetch()}
        retrying={query.isFetching}
      />
    </div>
  );
}
