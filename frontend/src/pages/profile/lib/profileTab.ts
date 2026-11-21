import {
  DEFAULT_PROFILE_TAB,
  PROFILE_PATH,
  PROFILE_TABS,
  PROFILE_TAB_PARAM,
} from '@/pages/profile/config/profileView.const';
import type { ProfileTabId } from '@/pages/profile/config/profileView.const';

/** The section a `?tab=` value names. A missing, unknown or unavailable one is the default. */
export function parseProfileTab(value: string | null): ProfileTabId {
  const tab = PROFILE_TABS.find((entry) => entry.id === value);
  return tab?.available ? tab.id : DEFAULT_PROFILE_TAB;
}

/** The link to a section: the default one is the bare profile address. */
export function profileTabHref(tab: ProfileTabId): string {
  return tab === DEFAULT_PROFILE_TAB ? PROFILE_PATH : `${PROFILE_PATH}?${PROFILE_TAB_PARAM}=${tab}`;
}
