import { PROFILE_LOAD_ERROR_MESSAGE } from '@/shared/ui/profileLoadError.const';
import ErrorCard from '@/shared/ui/ErrorCard';

interface ProfileLoadErrorProps {
  onRetry: () => unknown;
  /** A retry is in flight: the button shows it and ignores further activations. */
  retrying?: boolean;
}

/** Recoverable load failure. Never shows server details; the user can retry. */
export default function ProfileLoadError({ onRetry, retrying = false }: ProfileLoadErrorProps) {
  return (
    <ErrorCard
      message={PROFILE_LOAD_ERROR_MESSAGE}
      onRetry={onRetry}
      retrying={retrying}
      className="p-6"
    />
  );
}
