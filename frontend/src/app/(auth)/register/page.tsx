'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/lib/validations/auth';
import type { RegisterFormData } from '@/lib/validations/auth';
import { authService } from '@/services/authService';
import { useStore } from '@/store';
import { CATEGORIES } from '@/constants/categories';
import OrbitaLogo from '@/components/ui/OrbitaLogo';
import FormField from '@/components/ui/FormField';

export default function RegisterPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { interests: [] },
  });

  const selectedInterests = useWatch({ control, name: 'interests' }) ?? [];

  async function onSubmit(data: RegisterFormData) {
    setServerError(null);
    try {
      const response = await authService.register({
        username: data.username,
        email: data.email,
        password: data.password,
        displayName: data.displayName,
        interests: data.interests,
      });
      const { user, token, refreshToken } = response.data;
      setUser(user, token, refreshToken);
      router.push('/');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setServerError(message);
    }
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="flex flex-col items-center gap-2 mb-6">
        <OrbitaLogo size={85} />
        <h1 className="text-gray-900 font-bold text-4xl text-center mt-2">Join Our Community</h1>
        <p className="text-gray-500 text-base text-center">
          Create your account and start sharing your ideas
        </p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl p-8 flex flex-col gap-5"
      >
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
            {serverError}
          </div>
        )}

        <FormField
          label="Username"
          error={errors.username?.message}
          hint="This will be your public display name"
          id="username"
        >
          <input
            {...register('username')}
            id="username"
            type="text"
            placeholder="Choose a unique username"
            autoComplete="username"
            className={`input ${errors.username ? 'ring-2 ring-red-500' : ''}`}
          />
        </FormField>

        <FormField label="Display Name" error={errors.displayName?.message} id="displayName">
          <input
            {...register('displayName')}
            id="displayName"
            type="text"
            placeholder="Your full name or nickname"
            autoComplete="name"
            className={`input ${errors.displayName ? 'ring-2 ring-red-500' : ''}`}
          />
        </FormField>

        <FormField label="Email" error={errors.email?.message} id="email">
          <input
            {...register('email')}
            id="email"
            type="email"
            placeholder="your.email@example.com"
            autoComplete="email"
            className={`input ${errors.email ? 'ring-2 ring-red-500' : ''}`}
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
            className={`input ${errors.password ? 'ring-2 ring-red-500' : ''}`}
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
            className={`input ${errors.confirmPassword ? 'ring-2 ring-red-500' : ''}`}
          />
        </FormField>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-gray-900 font-semibold text-base">Select Your Interests</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Choose topics you&apos;re interested in to personalize your feed
            </p>
          </div>

          <Controller
            name="interests"
            control={control}
            render={({ field }) => (
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(({ key, label, color }) => {
                  const active = (field.value ?? []).includes(key);
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const current = field.value ?? [];
                        field.onChange(
                          active ? current.filter((k) => k !== key) : [...current, key]
                        );
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                        active
                          ? 'border-blue-600 bg-blue-50'
                          : 'border-transparent bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full ${color} flex items-center justify-center shrink-0`}
                      >
                        <span className="text-white font-bold text-lg">{label[0]}</span>
                      </div>
                      <span className="text-gray-900 font-semibold text-sm">{label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          />

          <p className="text-gray-500 text-xs">
            Selected {selectedInterests.length} topic
            {selectedInterests.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            className={`flex items-center gap-3 rounded-lg px-4 py-3 cursor-pointer ${
              errors.terms ? 'bg-red-50' : 'bg-gray-100'
            }`}
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

        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-500 text-xs">Or continue with</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          {['Google', 'GitHub', 'Discord'].map((provider) => (
            <button
              key={provider}
              type="button"
              className="flex items-center justify-center py-2.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 text-xs text-gray-700 font-medium"
            >
              {provider}
            </button>
          ))}
        </div>

        <p className="text-gray-500 text-sm text-center">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-semibold">
            Sign In
          </Link>
        </p>
      </form>

      <p className="text-gray-500 text-xs text-center mt-4">
        By signing up, you agree to our community guidelines and terms.
      </p>
    </div>
  );
}
