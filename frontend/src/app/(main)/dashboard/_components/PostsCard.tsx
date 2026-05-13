import { TOP_POSTS } from '@/constants/posts';
import TopPostRow from './TopPostRow';

export default function PostsCard() {
  return (
    <div className="bg-slate-800 rounded-xl p-5 flex flex-col gap-4">
      <h2 className="text-gray-50 font-semibold text-xl">Top Performing Posts</h2>
      <div className="flex flex-col gap-2">
        {TOP_POSTS.map(({ title, views, engagement }, i) => (
          <TopPostRow
            key={title}
            rank={i + 1}
            title={title}
            views={views}
            engagement={engagement}
          />
        ))}
      </div>
    </div>
  );
}
