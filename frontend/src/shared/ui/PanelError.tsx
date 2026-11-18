interface PanelErrorProps {
  message: string;
  onRetry: () => void;
  /** A retry is running: the button ignores further clicks. */
  retrying: boolean;
}

/** A fixed message and a retry inside a card, never the server's text. */
export default function PanelError({ message, onRetry, retrying }: PanelErrorProps) {
  return (
    <div role="alert" className="flex flex-col items-start gap-2 text-sm text-fg-muted">
      <p>{message}</p>
      <button
        type="button"
        onClick={() => {
          if (!retrying) onRetry();
        }}
        aria-disabled={retrying}
        className="rounded border border-line-strong px-3 py-1 text-sm font-semibold text-fg hover:bg-raised aria-disabled:opacity-60 aria-disabled:cursor-not-allowed focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        {retrying ? 'Trying…' : 'Try again'}
      </button>
    </div>
  );
}
