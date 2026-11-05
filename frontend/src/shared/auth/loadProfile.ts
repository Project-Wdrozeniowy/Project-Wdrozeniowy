import { currentProfile } from '@/shared/api/generated/orbita.api';
import { tokenMemory } from './tokenMemory';

/** A session is published only after the profile belonging to its pending token loads. */
export async function loadProfile(accessToken: string) {
  tokenMemory.set(accessToken);
  try {
    return await currentProfile();
  } catch (error) {
    // PWDRZ-155: a late failure must not erase a newer session.
    if (tokenMemory.get() === accessToken) tokenMemory.set(null);
    throw error;
  }
}
