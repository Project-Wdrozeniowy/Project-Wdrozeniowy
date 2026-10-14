import { PROFILE_LOAD_ERROR_MESSAGE } from '@/app/(main)/(protected)/profile/_ui/profileView.const';

interface ProfileLoadErrorProps {
  onRetry: () => void;
  /** A retry is in flight: the button shows it and ignores further clicks. */
  retrying?: boolean;
}

/** Recoverable load failure. Never shows server details; the user can retry. */
export default function ProfileLoadError({ onRetry, retrying = false }: ProfileLoadErrorProps) {
  return (
    <div role="alert" className="bg-white rounded-xl p-6 flex flex-col items-start gap-3">
      <p className="text-gray-900 text-sm">{PROFILE_LOAD_ERROR_MESSAGE}</p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {retrying ? 'Trying again…' : 'Try again'}
      </button>
    </div>
  );
}
