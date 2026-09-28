import Link from 'next/link';
import { ChevronRightIcon } from '@/components/ui/icons';
import { TRENDING_TOPICS } from '@/constants/sidebar';

export default function TrendingTopics() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-4">
      <h2 className="text-gray-50 font-semibold text-xl leading-none">Trending Topics</h2>
      <div className="flex flex-col gap-0.5">
        {TRENDING_TOPICS.map(({ rank, name, color }) => (
          <Link
            key={name}
            href={`/forum?${new URLSearchParams({ topic: name }).toString()}`}
            className="flex items-center justify-between py-2 group"
          >
            <div className="flex items-center gap-3">
              <span className="text-slate-400 font-bold text-xl w-4 text-center">{rank}</span>
              <span className={`w-3 h-3 rounded-full ${color} shrink-0`} />
              <span className="text-gray-50 text-sm group-hover:text-blue-400 transition-colors">
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
