import { useId } from 'react';
import {
  INTERESTS_LIST_LABEL,
  INTERESTS_TITLE,
  INTERESTS_UNAVAILABLE_BADGE,
  INTERESTS_UNAVAILABLE_TEXT,
} from '@/features/sign-up/interests.const';
import { CATEGORIES } from '@/shared/constants/categories.const';
import { cn } from '@/shared/lib/cn';

/**
 * The topics a new user will be able to pick. PROVISIONAL (PWDRZ-154): there is no backend
 * contract for interests yet, so the topics are only shown, cannot be selected, and the text says
 * why. Nothing here is form state or part of the registration request. See `interests.const.ts`.
 */
export default function InterestsPicker() {
  const titleId = useId();
  const textId = useId();

  return (
    <section aria-labelledby={titleId} aria-describedby={textId} className="flex flex-col gap-3">
      <div>
        <div className="flex items-center gap-2">
          <p id={titleId} className="text-gray-900 font-semibold text-base">
            {INTERESTS_TITLE}
          </p>
          <span className="bg-gray-200 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded">
            {INTERESTS_UNAVAILABLE_BADGE}
          </span>
        </div>
        <p id={textId} className="text-gray-500 text-xs mt-0.5">
          {INTERESTS_UNAVAILABLE_TEXT}
        </p>
      </div>

      {/* Not buttons and not dimmed: there is nothing to press, and the text stays readable. */}
      <ul aria-label={INTERESTS_LIST_LABEL} className="grid grid-cols-2 gap-2">
        {CATEGORIES.map(({ key, label, color }) => (
          <li key={key} className="flex items-center gap-3 p-3 rounded-lg bg-gray-100">
            <div
              aria-hidden="true"
              className={cn(
                'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                color
              )}
            >
              <span className="text-white font-bold text-lg">{label[0]}</span>
            </div>
            <span className="text-gray-700 font-semibold text-sm">{label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
