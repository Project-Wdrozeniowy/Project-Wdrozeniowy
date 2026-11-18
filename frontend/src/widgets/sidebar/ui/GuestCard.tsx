import { Link } from 'react-router';

export default function GuestCard() {
  return (
    <div className="bg-surface rounded-xl p-4 flex flex-col gap-3 border border-line">
      <p className="text-fg font-semibold text-sm">Join the community</p>
      <p className="text-fg-subtle text-xs">
        Sign in to save posts, vote, and personalize your feed.
      </p>
      <div className="flex gap-2">
        <Link
          to="/login"
          className="flex-1 text-center py-2 rounded text-sm font-semibold text-fg bg-raised hover:bg-raised-hover transition-colors"
        >
          Sign in
        </Link>
        <Link
          to="/register"
          className="flex-1 text-center py-2 rounded text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
        >
          Sign up
        </Link>
      </div>
    </div>
  );
}
