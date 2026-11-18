import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useBlocker } from 'react-router';
import UnsavedChangesConfirm from '@/features/edit-profile/UnsavedChangesConfirm';
import FormField from '@/shared/ui/FormField';
import {
  BIO_MAX_LENGTH,
  PROFILE_FIELDS,
  PROFILE_SAVED_MESSAGE,
} from '@/features/edit-profile/profile.const';
import type { ProfileField } from '@/features/edit-profile/profile.const';
import { useUpdateProfile } from '@/shared/api/profile/useUpdateProfile';
import { cn } from '@/shared/lib/cn';
import {
  buildUpdateRequest,
  getProfileSaveError,
  profileToFormValues,
} from '@/features/edit-profile/profile';
import { toast } from '@/shared/lib/toast';
import { profileSchemaFor } from '@/features/edit-profile/profile.schema';
import type { ProfileFormData } from '@/features/edit-profile/profile.schema';
import type { MyProfileDto as MyProfile } from '@/shared/api/generated/models/myProfileDto.dto';

const SUBMIT_CLASS =
  'bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const DISCARD_CLASS =
  'text-fg-muted hover:text-fg font-semibold text-sm px-3 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

interface ProfileFormProps {
  profile: MyProfile;
  /** The fields this form shows. The others stay as the server has them and are never sent. */
  fields: readonly ProfileField[];
  /** Names the form for everyone, including screen readers. */
  title: string;
}

/**
 * Edits some of the profile fields through `PATCH /users/me`. The settings page shows it twice
 * (profile fields, account email), so both share one validation, one save path and one cache.
 */
export default function ProfileForm({ profile, fields, title }: ProfileFormProps) {
  const shows = (field: ProfileField) => fields.includes(field);
  const { mutateAsync, isPending } = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    setFocus,
    control,
    formState: { errors },
  } = useForm<ProfileFormData>({
    // Fields this form does not show are not validated here: the user could not fix them.
    resolver: zodResolver(profileSchemaFor(fields)),
    // The form follows the server's profile: fields the user has not touched take newer values
    // (for example an edit made on another device), fields being edited keep the user's text.
    // No remount, so focus and unsaved edits survive.
    values: profileToFormValues(profile),
    resetOptions: { keepDirtyValues: true },
  });

  // useWatch (not watch) so the React Compiler can optimize this component.
  const watched = useWatch({ control });
  const values: ProfileFormData = {
    email: watched.email ?? '',
    displayName: watched.displayName ?? '',
    avatarUrl: watched.avatarUrl ?? '',
    bio: watched.bio ?? '',
  };
  // Saving with nothing changed would only send an empty PATCH.
  const hasChanges = Object.keys(buildUpdateRequest(values, profile, fields)).length > 0;

  // Leaving with unsaved edits asks first. While saving, the edits are on their way: no prompt.
  const dirty = hasChanges && !isPending;
  const blocker = useBlocker(dirty);
  // A reload or a closed tab cannot be asked by the app; the browser shows its own warning.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // Keyboard and screen reader users must land on the problem, not on the page body.
  useEffect(() => {
    if (formError) alertRef.current?.focus();
  }, [formError]);

  async function onSubmit(formValues: ProfileFormData) {
    if (isPending) return;
    const request = buildUpdateRequest(formValues, profile, fields);
    if (Object.keys(request).length === 0) return;

    setFormError(null);
    try {
      const updated = await mutateAsync({ data: request });
      reset(profileToFormValues(updated), { keepDirtyValues: false });
      toast.success(PROFILE_SAVED_MESSAGE);
    } catch (error: unknown) {
      const { fields, form } = getProfileSaveError(error);
      const rejected = PROFILE_FIELDS.filter((field) => fields[field]);
      for (const field of rejected) {
        setError(field, { type: 'server', message: fields[field] });
      }
      if (rejected.length > 0) setFocus(rejected[0]);
      setFormError(form ?? null);
    }
  }

  function handleDiscard() {
    if (isPending) return;
    // Explicit: the form's default reset keeps dirty values, and Discard must not.
    reset(profileToFormValues(profile), { keepDirtyValues: false });
    setFormError(null);
  }

  function describedBy(id: string, hasHint: boolean, field: keyof ProfileFormData) {
    const ids = [hasHint ? `${id}-hint` : null, errors[field] ? `${id}-error` : null];
    return ids.filter(Boolean).join(' ') || undefined;
  }

  // The trimmed length is what validation checks and what is sent.
  const bioLength = values.bio.trim().length;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      aria-label={title}
      className="bg-surface rounded-xl p-6 flex flex-col gap-5 border border-line"
    >
      <h2 className="text-fg font-semibold text-lg">{title}</h2>

      {blocker.state === 'blocked' && (
        <UnsavedChangesConfirm onStay={() => blocker.reset()} onLeave={() => blocker.proceed()} />
      )}

      {formError && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 text-red-700 dark:text-red-300 text-sm px-4 py-3 rounded"
        >
          {formError}
        </div>
      )}

      {shows('email') && (
        <FormField label="Email" id="profile-email" error={errors.email?.message}>
          <input
            {...register('email')}
            id="profile-email"
            type="email"
            autoComplete="email"
            readOnly={isPending}
            aria-invalid={Boolean(errors.email)}
            aria-describedby={describedBy('profile-email', false, 'email')}
            className={cn('input', errors.email && 'ring-2 ring-red-500')}
          />
        </FormField>
      )}

      {shows('displayName') && (
        <FormField
          label="Display name"
          id="profile-displayName"
          hint="Shown instead of your username. Leave it empty to use your username."
          error={errors.displayName?.message}
        >
          <input
            {...register('displayName')}
            id="profile-displayName"
            type="text"
            autoComplete="nickname"
            readOnly={isPending}
            aria-invalid={Boolean(errors.displayName)}
            aria-describedby={describedBy('profile-displayName', true, 'displayName')}
            className={cn('input', errors.displayName && 'ring-2 ring-red-500')}
          />
        </FormField>
      )}

      {shows('avatarUrl') && (
        <FormField
          label="Avatar link"
          id="profile-avatarUrl"
          hint="A link to an image, starting with http:// or https://."
          error={errors.avatarUrl?.message}
        >
          <input
            {...register('avatarUrl')}
            id="profile-avatarUrl"
            type="url"
            inputMode="url"
            autoComplete="off"
            readOnly={isPending}
            aria-invalid={Boolean(errors.avatarUrl)}
            aria-describedby={describedBy('profile-avatarUrl', true, 'avatarUrl')}
            className={cn('input', errors.avatarUrl && 'ring-2 ring-red-500')}
          />
        </FormField>
      )}

      {shows('bio') && (
        <FormField
          label="Bio"
          id="profile-bio"
          hint={`${bioLength}/${BIO_MAX_LENGTH}`}
          error={errors.bio?.message}
        >
          <textarea
            {...register('bio')}
            id="profile-bio"
            rows={4}
            readOnly={isPending}
            aria-invalid={Boolean(errors.bio)}
            aria-describedby={describedBy('profile-bio', true, 'bio')}
            className={cn('input resize-none', errors.bio && 'ring-2 ring-red-500')}
          />
        </FormField>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={!hasChanges}
          // aria-disabled (not disabled) while saving: the button keeps keyboard focus.
          aria-disabled={isPending}
          className={SUBMIT_CLASS}
        >
          {isPending ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={handleDiscard}
          disabled={!hasChanges}
          aria-disabled={isPending}
          className={DISCARD_CLASS}
        >
          Discard changes
        </button>
      </div>
    </form>
  );
}
