import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router';
import { CommentSection } from '@/features/post-comments/CommentSection';
import { POST_ERROR_TEXT } from '@/pages/post/config/post.const';
import { isPostNotFound } from '@/pages/post/lib/postView';
import { usePost } from '@/shared/api/forum/usePost';
import PanelError from '@/shared/ui/PanelError';
import PostArticle from './PostArticle';
import PostNotFound from './PostNotFound';
import PostSkeleton from './PostSkeleton';

export default function PostPage() {
  const { slug = '' } = useParams();
  const query = usePost(slug);
  const { hash } = useLocation();

  // The "N Comments" links point at #comments, which exists only once the post has loaded: the
  // browser's own scroll to a fragment has already come and gone by then, so scroll here.
  const loadedId = query.data?.id;
  useEffect(() => {
    if (loadedId !== undefined && hash === '#comments') {
      document.getElementById('comments')?.scrollIntoView();
    }
  }, [loadedId, hash]);

  if (slug === '') return <PostNotFound />;

  // A post that was loaded stays on screen even if a later refresh fails, unless the refresh says
  // the post is gone (deleted meanwhile).
  if (query.isError && isPostNotFound(query.error)) return <PostNotFound />;
  if (query.data) {
    return (
      <div className="flex flex-col gap-6">
        <PostArticle post={query.data} />
        {/* The target of the "N Comments" links. */}
        <div id="comments">
          <CommentSection slug={slug} />
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
