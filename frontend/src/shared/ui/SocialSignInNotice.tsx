import { useId } from 'react';
import {
  SOCIAL_DIVIDER_TEXT,
  SOCIAL_LIST_LABEL,
  SOCIAL_PROVIDERS,
  SOCIAL_UNAVAILABLE_BADGE,
  SOCIAL_UNAVAILABLE_TEXT,
} from '@/shared/ui/socialSignIn.const';

/**
 * The providers of the sign-in and sign-up forms, shown as unavailable. PROVISIONAL: there is no
 * social sign-in contract, so nothing here can be pressed, and the text says why. A control that
 * did nothing when pressed was the problem this replaces. See `socialSignIn.const.ts`.
 */
export default function SocialSignInNotice() {
  const titleId = useId();
  const textId = useId();

  return (
    <section aria-labelledby={titleId} aria-describedby={textId} className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div aria-hidden="true" className="flex-1 h-px bg-raised-hover" />
        <span id={titleId} className="text-fg-subtle text-xs">
          {SOCIAL_DIVIDER_TEXT}
        </span>
        <span className="bg-raised-hover text-fg-soft text-xs font-semibold px-2 py-0.5 rounded">
          {SOCIAL_UNAVAILABLE_BADGE}
        </span>
        <div aria-hidden="true" className="flex-1 h-px bg-raised-hover" />
      </div>

      <p id={textId} className="text-fg-subtle text-xs text-center">
        {SOCIAL_UNAVAILABLE_TEXT}
      </p>

      {/* Dashed and muted, not button-like: there is nothing to press, and the text stays readable. */}
      <ul aria-label={SOCIAL_LIST_LABEL} className="grid grid-cols-3 gap-2">
        {SOCIAL_PROVIDERS.map((provider) => (
          <li
            key={provider}
            className="flex items-center justify-center py-2.5 rounded border border-dashed border-line text-xs text-fg-subtle font-medium"
          >
            {provider}
          </li>
        ))}
      </ul>
    </section>
  );
}
