import { TODAY_MAY_GROW_TEXT } from '@/pages/dashboard/config/dashboard.const';
import { utcMoment } from '@/pages/dashboard/lib/utcTime';

interface UpdatedAtProps {
  /** When the platform read the figures, as the response says. */
  generatedAt: string;
}

/** "Updated <time> UTC. Counts for today may grow.": one wording for every card that has a read time. */
export default function UpdatedAt({ generatedAt }: UpdatedAtProps) {
  return (
    <>
      Updated <time dateTime={generatedAt}>{utcMoment(generatedAt)} UTC</time>.{' '}
      {TODAY_MAY_GROW_TEXT}
    </>
  );
}
