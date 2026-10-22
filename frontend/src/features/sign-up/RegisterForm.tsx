'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import InterestsPicker from '@/features/sign-up/InterestsPicker';
import { REGISTER_FIELDS } from '@/features/sign-up/register.const';
import type { RegisterError } from '@/features/sign-up/register';
import { registerSchema } from '@/features/sign-up/register.schema';
import type { RegisterFormData } from '@/features/sign-up/register.schema';
import { useSignUp } from '@/features/sign-up/useSignUp';
import { cn } from '@/shared/lib/cn';
import SocialAuthButtons from '@/shared/ui/SocialAuthButtons';
import FormField from '@/shared/ui/FormField';

export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    control,
    setError,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { interests: [] },
  });

  // The form keeps everything the user typed; only the rejected fields are marked.
  function markRejectedFields(fields: RegisterError['fields']) {
    const rejected = REGISTER_FIELDS.filter((field) => fields[field]);
    for (const field of rejected) setError(field, { type: 'server', message: fields[field] });
    if (rejected.length > 0) setFocus(rejected[0]);
  }

  const { signUp, serverError } = useSignUp(markRejectedFields);

  return (
    <form onSubmit={handleSubmit(signUp)} className="bg-white rounded-xl p-8 flex flex-col gap-5">
      {serverError && (
        <div
          role="alert"
          className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded"
        >
          {serverError}
        </div>
      )}

      <FormField
        label="Username"
        error={errors.username?.message}
        hint="Your unique handle, 3 to 50 characters"
        id="username"
      >
        <input
          {...register('username')}
          id="username"
          type="text"
          placeholder="Choose a unique username"
          autoComplete="username"
          className={cn('input', errors.username && 'ring-2 ring-red-500')}
        />
      </FormField>

      <FormField
        label="Display Name"
        hint="Shown instead of your username. Leave it empty to use your username."
        error={errors.displayName?.message}
        id="displayName"
      >
        <input
          {...register('displayName')}
          id="displayName"
          type="text"
          placeholder="Your full name or nickname"
          autoComplete="name"
          className={cn('input', errors.displayName && 'ring-2 ring-red-500')}
        />
      </FormField>

      <FormField label="Email" error={errors.email?.message} id="email">
        <input
          {...register('email')}
          id="email"
          type="email"
          placeholder="your.email@example.com"
          autoComplete="email"
          className={cn('input', errors.email && 'ring-2 ring-red-500')}
        />
      </FormField>

      <FormField
        label="Password"
        error={errors.password?.message}
        hint="Minimum 8 characters with letters and numbers"
        id="password"
      >
        <input
          {...register('password')}
          id="password"
          type="password"
          placeholder="Create a strong password"
          autoComplete="new-password"
          className={cn('input', errors.password && 'ring-2 ring-red-500')}
        />
      </FormField>

      <FormField
        label="Confirm Password"
        error={errors.confirmPassword?.message}
        id="confirmPassword"
      >
        <input
          {...register('confirmPassword')}
          id="confirmPassword"
          type="password"
          placeholder="Re-enter your password"
          autoComplete="new-password"
          className={cn('input', errors.confirmPassword && 'ring-2 ring-red-500')}
        />
      </FormField>

      <InterestsPicker control={control} />

      <div className="flex flex-col gap-1.5">
        <label
          className={cn(
            'flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer',
            errors.terms ? 'bg-red-50' : 'bg-gray-100'
          )}
        >
          <input
            {...register('terms')}
            type="checkbox"
            className="w-4 h-4 rounded accent-blue-600"
          />
          <span className="text-gray-900 font-semibold text-sm">
            I agree to the Terms of Service and Privacy Policy
          </span>
        </label>
        {errors.terms && <p className="text-red-500 text-xs">{errors.terms.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded transition-colors"
      >
        {isSubmitting ? 'Creating account…' : 'Create Account'}
      </button>

      <SocialAuthButtons />

      <p className="text-gray-500 text-sm text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-blue-600 hover:underline font-semibold">
          Sign In
        </Link>
      </p>
    </form>
  );
}
