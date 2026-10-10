import {
  EMAIL_TAKEN_MESSAGE,
  PROFILE_FIELDS,
  PROFILE_SAVE_ERROR_MESSAGE,
  PROFILE_SERVER_FIELD_ERRORS,
} from '@/constants/profile';
import type { ProfileField } from '@/constants/profile';
import { apiErrorStatus } from '@/lib/apiError';
import type { ProfileFormData } from '@/lib/validations/profile';
import type { MyProfile, ProblemDetail, UpdateProfileRequest } from '@/shared/types';

/** Form values for a profile. The API's `null` (not set) is an empty input. */
export function profileToFormValues(profile: MyProfile): ProfileFormData {
  return {
    email: profile.email,
    displayName: profile.displayName ?? '',
    avatarUrl: profile.avatarUrl ?? '',
    bio: profile.bio ?? '',
  };
}

/**
 * The PATCH body: only the fields that changed, trimmed. An omitted field stays as it is on the
 * server and an empty string clears it, so clearing an input is a real change worth sending.
 */
export function buildUpdateRequest(
  values: ProfileFormData,
  profile: MyProfile
): UpdateProfileRequest {
  const current = profileToFormValues(profile);
  const request: UpdateProfileRequest = {};
  for (const field of PROFILE_FIELDS) {
    const next = values[field].trim();
    if (next !== current[field]) {
      request[field] = next;
    }
  }
  return request;
}

export interface ProfileSaveError {
  /** Messages to show under specific inputs. */
  fields: Partial<Record<ProfileField, string>>;
  /** A message for the whole form, set when no field is to blame. */
  form?: string;
}

function isProfileField(key: string): key is ProfileField {
  return (PROFILE_FIELDS as readonly string[]).includes(key);
}

/**
 * Turns a failed save into messages written by us. Server texts are never shown: validation
 * messages are not meant for users and anything else (5xx, network) could expose internals.
 * A 401 never gets here: the API client refreshes the session or sends the user to /login.
 */
export function getProfileSaveError(error: unknown): ProfileSaveError {
  const status = apiErrorStatus(error);

  if (status === 409) {
    return { fields: { email: EMAIL_TAKEN_MESSAGE } };
  }

  if (status === 400) {
    const body = (error as { response?: { data?: ProblemDetail } }).response?.data;
    const fields: ProfileSaveError['fields'] = {};
    for (const key of Object.keys(body?.errors ?? {})) {
      if (isProfileField(key)) fields[key] = PROFILE_SERVER_FIELD_ERRORS[key];
    }
    if (Object.keys(fields).length > 0) return { fields };
  }
  return { fields: {}, form: PROFILE_SAVE_ERROR_MESSAGE };
}
