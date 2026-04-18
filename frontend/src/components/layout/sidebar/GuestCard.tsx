import Link from 'next/link';

export default function GuestCard() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex flex-col gap-3">
      <p className="text-gray-50 font-semibold text-sm">Join the community</p>
      <p className="text-slate-400 text-xs">
        Sign in to save posts, vote, and personalize your feed.
      </p>
      <div className="flex gap-2">
        <Link
          href="/login"
          className="flex-1 text-center py-2 rounded text-sm font-semibold text-gray-50 bg-slate-700 hover:bg-slate-600 transition-colors"
        >
          Sign in
        </Link>
        <Link
          href="/register"
          className="flex-1 text-center py-2 rounded text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
