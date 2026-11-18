import { CONSENT_DETAILS_LABEL, STORAGE_ITEMS } from './consentBanner.const';

export default function ConsentDetails() {
  return (
    <details className="text-sm text-fg-muted">
      <summary className="cursor-pointer text-fg font-semibold w-fit focus-visible:outline-2 focus-visible:outline-blue-500">
        {CONSENT_DETAILS_LABEL}
      </summary>
      <ul className="mt-2 flex flex-col gap-2">
        {STORAGE_ITEMS.map((item) => (
          <li key={item.id}>
            <span className="text-fg font-medium">{item.name}</span>
            <span className="text-fg-subtle"> — {item.optional ? 'optional' : 'needed'}. </span>
            {item.purpose}
          </li>
        ))}
      </ul>
    </details>
  );
}
