import RetryButton from '@/shared/ui/RetryButton';

interface PanelErrorProps {
  message: string;
  onRetry: () => unknown;
  /** A retry is running: the button ignores further activations. */
  retrying: boolean;
}

/** A fixed message and a retry inside a card, never the server's text. */
export default function PanelError({ message, onRetry, retrying }: PanelErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 text-sm text-fg-muted">
      <p>{message}</p>
      <RetryButton onRetry={onRetry} retrying={retrying} variant="outline" />
    </div>
  );
}
