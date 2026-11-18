import { formatChange } from '@/shared/lib/formatChange';
import { usePublicActivityComparison } from '@/shared/api/analytics/usePublicActivityComparison';
import { cn } from '@/shared/lib/cn';
import QueryState from '@/shared/ui/QueryState';
import { COMMUNITY_ACTIVITY_TITLE, SIDEBAR_PERIOD, SIDEBAR_PERIOD_LABEL } from './sidebar.const';

const TONE_CLASS = {
  up: 'text-success',
  down: 'text-danger',
  flat: 'text-fg-subtle',
  none: 'text-fg-subtle',
} as const;

function ActivitySkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading community activity"
      aria-busy="true"
      className="flex flex-col gap-2"
    >
      <div className="h-8 bg-raised rounded animate-pulse" />
      <div className="h-8 bg-raised rounded animate-pulse" />
    </div>
  );
}

/** Posts and comments of the last seven days, as the platform counts them. Public data only. */
export default function CommunityActivity() {
  const query = usePublicActivityComparison(SIDEBAR_PERIOD);
  const rows = query.data
    ? [
        { label: 'Posts', figures: query.data.posts },
        { label: 'Comments', figures: query.data.comments },
      ]
    : [];

  return (
    <section
      aria-label={COMMUNITY_ACTIVITY_TITLE}
      className="bg-surface rounded-xl p-4 flex flex-col gap-4 border border-line"
    >
      <div className="flex flex-col gap-1">
        <h2 className="text-fg font-semibold text-xl leading-none">{COMMUNITY_ACTIVITY_TITLE}</h2>
        <p className="text-fg-subtle text-xs">{SIDEBAR_PERIOD_LABEL}</p>
      </div>
      <QueryState query={query} skeleton={<ActivitySkeleton />}>
        <dl className="flex flex-col gap-2">
          {rows.map(({ label, figures }) => {
            const change = formatChange(figures.changePercent);
            return (
              <div key={label} className="flex items-center justify-between">
                <dt className="text-fg text-sm">{label}</dt>
                <dd className="flex items-center gap-2">
                  {change.tone !== 'none' && (
                    <span className={cn('text-xs', TONE_CLASS[change.tone])}>{change.text}</span>
                  )}
                  <span className="text-fg font-semibold text-base">
                    {figures.current.toLocaleString('en-US')}
                  </span>
                </dd>
              </div>
            );
          })}
        </dl>
      </QueryState>
    </section>
  );
}
