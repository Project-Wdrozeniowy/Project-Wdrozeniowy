'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import PasswordChangeConfirm from '@/features/change-password/PasswordChangeConfirm';
import {
  NEW_PASSWORD_MIN_LENGTH,
  PASSWORD_CHANGED_MESSAGE,
  PASSWORD_FIELDS,
} from '@/features/change-password/changePassword.const';
import {
  getPasswordChangeError,
  toChangePasswordRequest,
} from '@/features/change-password/changePassword';
import { changePasswordSchema } from '@/features/change-password/changePassword.schema';
import type { ChangePasswordFormData } from '@/features/change-password/changePassword.schema';
import { useChangePassword } from '@/shared/api/profile/useChangePassword';
import { cn } from '@/shared/lib/cn';
import { toast } from '@/shared/lib/toast';
import FormField from '@/shared/ui/FormField';
import { useStore } from '@/store';

const SUBMIT_CLASS =
  'bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm px-5 py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed';

const EMPTY_VALUES: ChangePasswordFormData = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

/**
 * `POST /users/me/password`. The change signs the user out on every device, so a valid form first
 * asks for confirmation, and a successful change ends this session here too.
 */
export default function ChangePasswordForm() {
  const router = useRouter();
  const logout = useStore((state) => state.logout);
  const { mutateAsync, isPending } = useChangePassword();
  // The values that passed validation, kept while the user confirms: that is what is sent.
  const [validated, setValidated] = useState<ChangePasswordFormData | null>(null);
  const confirming = validated !== null;
  const [formError, setFormError] = useState<string | null>(null);
  const alertRef = useRef<HTMLDivElement>(null);

  const {
    register,
    handleSubmit,
    setError,
    setFocus,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Keyboard and screen reader users must land on the problem, not on the page body.
  useEffect(() => {
    if (formError) alertRef.current?.focus();
  }, [formError]);

  async function changePassword() {
    if (isPending || !validated) return;
    setFormError(null);
    try {
      await mutateAsync(toChangePasswordRequest(validated));
    } catch (error: unknown) {
      const { fields, form } = getPasswordChangeError(error);
      setValidated(null);
      const rejected = PASSWORD_FIELDS.filter((field) => fields[field]);
      for (const field of rejected) setError(field, { type: 'server', message: fields[field] });
      if (rejected.length > 0) setFocus(rejected[0]);
      setFormError(form ?? null);
      return;
    }
    // The server has revoked every refresh token, this device's included, so there is nothing left
    // to log out of there. End the session here; this also clears the cached profile.
    logout();
    toast.success(PASSWORD_CHANGED_MESSAGE);
    router.replace('/login');
  }

  function describedBy(id: string, field: keyof ChangePasswordFormData, hint = false) {
    const ids = [hint ? `${id}-hint` : null, errors[field] ? `${id}-error` : null];
    return ids.filter(Boolean).join(' ') || undefined;
  }

  return (
    <form
      // A second submit (Enter) while the warning is open must not replace the confirmed values.
      onSubmit={handleSubmit((values) => setValidated((current) => current ?? values))}
      noValidate
      aria-label="Change password"
      className="bg-white rounded-xl p-6 flex flex-col gap-5"
    >
      <h2 className="text-gray-900 font-semibold text-lg">Change password</h2>

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

      <FormField
        label="Current password"
        id="password-current"
        error={errors.currentPassword?.message}
      >
        <input
          {...register('currentPassword')}
          id="password-current"
          type="password"
          autoComplete="current-password"
          readOnly={confirming || isPending}
          aria-invalid={Boolean(errors.currentPassword)}
          aria-describedby={describedBy('password-current', 'currentPassword')}
          className={cn('input', errors.currentPassword && 'ring-2 ring-red-500')}
        />
      </FormField>

      <FormField
        label="New password"
        id="password-new"
        hint={`At least ${NEW_PASSWORD_MIN_LENGTH} characters.`}
        error={errors.newPassword?.message}
      >
        <input
          {...register('newPassword')}
          id="password-new"
          type="password"
          autoComplete="new-password"
          readOnly={confirming || isPending}
          aria-invalid={Boolean(errors.newPassword)}
          aria-describedby={describedBy('password-new', 'newPassword', true)}
          className={cn('input', errors.newPassword && 'ring-2 ring-red-500')}
        />
      </FormField>

      <FormField
        label="Repeat new password"
        id="password-confirm"
        error={errors.confirmPassword?.message}
      >
        <input
          {...register('confirmPassword')}
          id="password-confirm"
          type="password"
          autoComplete="new-password"
          readOnly={confirming || isPending}
          aria-invalid={Boolean(errors.confirmPassword)}
          aria-describedby={describedBy('password-confirm', 'confirmPassword')}
          className={cn('input', errors.confirmPassword && 'ring-2 ring-red-500')}
        />
      </FormField>

      {confirming ? (
        <PasswordChangeConfirm
          pending={isPending}
          onConfirm={changePassword}
          onCancel={() => setValidated(null)}
        />
      ) : (
        <div>
          <button type="submit" className={SUBMIT_CLASS}>
            Change password
          </button>
        </div>
      )}
    </form>
  );
}
