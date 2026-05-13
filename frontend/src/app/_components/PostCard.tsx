'use client';

import { useState } from 'react';
import type { Post } from '@/types';
import { CATEGORY_COLORS } from '@/constants/categories';
import {
  CommentIcon,
  ShareIcon,
  SaveIcon,
  ChevronUpVoteIcon,
  ChevronDownVoteIcon,
} from '@/components/ui/icons';
import ActionButton from './ActionButton';
import VoteButton from './VoteButton';

export default function PostCard({ post }: { post: Post }) {
  const [votes, setVotes] = useState(post.votes);
  const [voted, setVoted] = useState<'up' | 'down' | null>(null);

  function handleVote(dir: 'up' | 'down') {
    if (voted === dir) {
      setVotes(post.votes);
      setVoted(null);
    } else if (voted === null) {
      setVotes((v) => v + (dir === 'up' ? 1 : -1));
      setVoted(dir);
    } else {
      setVotes((v) => v + (dir === 'up' ? 2 : -2));
      setVoted(dir);
    }
  }

  const categoryColor = CATEGORY_COLORS[post.category] ?? 'border-slate-500 text-slate-400';

  return (
    <article className="bg-slate-800 rounded-xl p-5 flex gap-4 hover:bg-slate-800/80 transition-colors">
      <div className="flex flex-col items-center gap-1 pt-1 shrink-0">
        <VoteButton direction="up" active={voted === 'up'} onClick={() => handleVote('up')}>
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
        <VoteButton direction="down" active={voted === 'down'} onClick={() => handleVote('down')}>
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
          <h2 className="text-gray-50 font-semibold text-xl leading-snug">{post.title}</h2>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded border self-start ${categoryColor}`}
          >
            {post.category}
          </span>
          <p className="text-slate-400 text-base leading-relaxed line-clamp-2">{post.excerpt}</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <ActionButton icon={<CommentIcon />} label={`${post.comments} Comments`} />
          <ActionButton icon={<ShareIcon />} label="Share" />
          <ActionButton icon={<SaveIcon />} label="Save" />
        </div>
      </div>
    </article>
  );
}
