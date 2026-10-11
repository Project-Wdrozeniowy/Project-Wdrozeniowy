'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import FormField from '@/components/ui/FormField';
import { BIO_MAX_LENGTH, PROFILE_FIELDS, PROFILE_SAVED_MESSAGE } from '@/constants/profile';
import { useUpdateProfile } from '@/hooks/useUpdateProfile';
import { cn } from '@/lib/cn';
import { buildUpdateRequest, getProfileSaveError, profileToFormValues } from '@/lib/profile';
import { toast } from '@/lib/toast';
import { profileSchema } from '@/lib/validations/profile';
import type { ProfileFormData } from '@/lib/validations/profile';
import type { MyProfile } from '@/shared/types';

const SUBMIT_CLASS =
  'bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed';
const DISCARD_CLASS =
  'text-gray-600 hover:text-gray-900 font-semibold text-sm px-3 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

interface ProfileFormProps {
  profile: MyProfile;
}

export default function ProfileForm({ profile }: ProfileFormProps) {
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
    resolver: zodResolver(profileSchema),
    defaultValues: profileToFormValues(profile),
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
  const hasChanges = Object.keys(buildUpdateRequest(values, profile)).length > 0;

  // Keyboard and screen reader users must land on the problem, not on the page body.
  useEffect(() => {
    if (formError) alertRef.current?.focus();
  }, [formError]);

  async function onSubmit(formValues: ProfileFormData) {
    if (isPending) return;
    const request = buildUpdateRequest(formValues, profile);
    if (Object.keys(request).length === 0) return;

    setFormError(null);
    try {
      const updated = await mutateAsync(request);
      reset(profileToFormValues(updated));
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
    reset(profileToFormValues(profile));
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
      aria-label="Account settings"
      className="bg-white rounded-xl p-6 flex flex-col gap-5"
    >
      <h2 className="text-gray-900 font-semibold text-lg">Account settings</h2>

      {formError && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded"
        >
          {formError}
        </div>
      )}

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
