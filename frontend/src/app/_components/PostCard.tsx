'use client';

import { useState } from 'react';
import { ACTION_UNAVAILABLE_HINT, VOTING_UNAVAILABLE_HINT } from '@/constants/forum';
import { getCategoryColor } from '@/lib/categoryColor';
import type { PostCardData } from '@/lib/postCard';
import { cn } from '@/lib/cn';
import {
  CommentIcon,
  ShareIcon,
  SaveIcon,
  ChevronUpVoteIcon,
  ChevronDownVoteIcon,
} from '@/components/ui/icons';
import ActionButton from './ActionButton';
import VoteButton from './VoteButton';

interface PostCardProps {
  post: PostCardData;
}

export default function PostCard({ post }: PostCardProps) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);
  const { actionsEnabled } = post;
  const voteHint = actionsEnabled ? undefined : VOTING_UNAVAILABLE_HINT;
  const actionHint = actionsEnabled ? undefined : ACTION_UNAVAILABLE_HINT;
  // Derived, so a refetched vote count is never hidden behind a stale copy in state.
  const votes = post.votes + (voted === 'up' ? 1 : voted === 'down' ? -1 : 0);

  function handleVote(dir: 'up' | 'down') {
    setVoted((current) => (current === dir ? null : dir));
  }

  const categoryColor = post.category
    ? getCategoryColor({ name: post.category, slug: post.categorySlug })
    : '';

  return (
    <article className="bg-slate-800 rounded-xl p-5 flex gap-4 hover:bg-slate-800/80 transition-colors">
      <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
        <VoteButton
          direction="up"
          active={voted === 'up'}
          onClick={() => handleVote('up')}
          disabled={!actionsEnabled}
          title={voteHint}
        >
          <ChevronUpVoteIcon />
        </VoteButton>
        <span
          className={
            voted === 'up'
              ? 'font-semibold text-sm text-blue-400'
              : voted === 'down'
                ? 'font-semibold text-sm text-red-400'
                : 'font-semibold text-sm text-white'
          }
        >
          {votes >= 1000 ? `${(votes / 1000).toFixed(1)}k` : votes}
        </span>
        <VoteButton
          direction="down"
          active={voted === 'down'}
          onClick={() => handleVote('down')}
          disabled={!actionsEnabled}
          title={voteHint}
        >
          <ChevronDownVoteIcon />
        </VoteButton>
      </div>

      <div className="flex-1 min-w-0 flex flex-col gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{post.userInitial}</span>
          </div>
          <span className="text-white font-semibold text-sm">{post.username}</span>
          <span className="text-slate-400 text-xs">• {post.timeAgo}</span>
          {post.badge && (
            <span className="bg-blue-600 text-white text-xs font-semibold px-2 py-0.5 rounded">
              {post.badge}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <h2 className="text-gray-50 font-semibold text-xl leading-snug break-words">
            {post.title}
          </h2>
          {post.category && (
            <span
              className={cn(
                'text-xs font-semibold px-2 py-0.5 rounded border self-start',
                categoryColor
              )}
            >
              {post.category}
            </span>
          )}
          {post.excerpt && (
            <p className="text-slate-400 text-base leading-relaxed line-clamp-2">{post.excerpt}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ActionButton
            icon={<CommentIcon />}
            label={`${post.comments} Comments`}
            disabled={!actionsEnabled}
            title={actionHint}
          />
          <ActionButton
            icon={<ShareIcon />}
            label="Share"
            disabled={!actionsEnabled}
            title={actionHint}
          />
          <ActionButton
            icon={<SaveIcon />}
            label="Save"
            disabled={!actionsEnabled}
            title={actionHint}
          />
        </div>
      </div>
    </article>
  );
}
