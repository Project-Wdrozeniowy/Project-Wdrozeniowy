import { writeStorageConsent } from '@/shared/lib/storageConsent';
import type { StoragePermissions } from '@/shared/lib/storageConsent';

/** A real current-version choice; shared by consumers instead of legacy success fixtures. */
export function seedStorageConsent(allowed = true, permissions?: StoragePermissions) {
  return writeStorageConsent(permissions ?? { theme: allowed, recentSearches: allowed });
}
