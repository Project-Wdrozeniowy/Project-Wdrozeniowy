import { Link } from 'react-router';
import { ChevronRightIcon } from '@/shared/ui/icons';
import { TRENDING_TOPICS } from '@/widgets/sidebar/ui/sidebar.const';
import { cn } from '@/shared/lib/cn';

export default function TrendingTopics() {
  return (
    <div className="bg-surface rounded-xl p-4 flex flex-col gap-4 border border-line">
      <h2 className="text-fg font-semibold text-xl leading-none">Trending Topics</h2>
      <div className="flex flex-col gap-0.5">
        {TRENDING_TOPICS.map(({ rank, name, color }) => (
          <Link
            key={name}
            to={`/forum?${new URLSearchParams({ topic: name }).toString()}`}
            className="flex items-center justify-between py-2 group"
          >
            <div className="flex items-center gap-3">
              <span className="text-fg-subtle font-bold text-xl w-4 text-center">{rank}</span>
              <span className={cn('w-3 h-3 rounded-full shrink-0', color)} />
              <span className="text-fg text-sm group-hover:text-accent transition-colors">
                {name}
              </span>
            </div>
            <ChevronRightIcon />
          </Link>
        ))}
      </div>
    </div>
  );
}
