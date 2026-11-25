import { utcDay } from '@/pages/dashboard/lib/utcTime';
import UpdatedAt from './UpdatedAt';

interface WindowMetaProps {
  /** Start of the first UTC day, inclusive. */
  windowStart: string;
  /** Start of the UTC day after the last one, exclusive. */
  windowEnd: string;
  /** When the platform read these figures. */
  generatedAt: string;
}

/**
 * Which days a card counts and when it was read, in UTC, as the response says. The current day is
 * counted up to the read time, so the card never reads as a live figure.
 */
export default function WindowMeta({ windowStart, windowEnd, generatedAt }: WindowMetaProps) {
  return (
    <>
      <p>
        {utcDay(windowStart)} – {utcDay(windowEnd)} (end exclusive), UTC
      </p>
      <p>
        <UpdatedAt generatedAt={generatedAt} />
      </p>
    </>
  );
}
