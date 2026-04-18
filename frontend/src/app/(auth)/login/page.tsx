'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/lib/validations/auth';
import type { LoginFormData } from '@/lib/validations/auth';
import { authService } from '@/services/authService';
import { useStore } from '@/store';

export default function LoginPage() {
  const router = useRouter();
  const { setUser } = useStore();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginFormData) {
    setServerError(null);
    try {
      const response = await authService.login(data);
      const { user, token, refreshToken } = response.data;
      setUser(user, token, refreshToken);
      router.push('/');
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Invalid email or password';
      setServerError(message);
    }
  }

  return (
    <div className="w-full max-w-md">
      {/* Logo + heading */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <OrbitaLogo />
        <h1 className="text-gray-900 font-bold text-4xl text-center mt-2">
          Welcome Back
        </h1>
        <p className="text-gray-500 text-base text-center">
          Sign in to your account to continue
        </p>
      </div>

      {/* Card */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white rounded-xl p-8 flex flex-col gap-5"
      >
        {/* Server error */}
        {serverError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
            {serverError}
          </div>
        )}

        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label className="text-gray-900 font-semibold text-sm">Email</label>
          <input
            {...register('email')}
            type="email"
            placeholder="your.email@example.com"
            autoComplete="email"
            className={`input ${errors.email ? 'ring-2 ring-red-500' : ''}`}
          />
          {errors.email && (
            <p className="text-red-500 text-xs">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label className="text-gray-900 font-semibold text-sm">
              Password
            </label>
            <Link
              href="/forgot-password"
              className="text-blue-600 hover:underline text-xs font-semibold"
            >
              Forgot password?
            </Link>
          </div>
          <input
            {...register('password')}
            type="password"
            placeholder="Enter your password"
            autoComplete="current-password"
            className={`input ${errors.password ? 'ring-2 ring-red-500' : ''}`}
          />
          {errors.password && (
            <p className="text-red-500 text-xs">{errors.password.message}</p>
          )}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded transition-colors"
        >
          {isSubmitting ? 'Signing in…' : 'Sign In'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-500 text-xs">Or continue with</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Social */}
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

        {/* Register link */}
        <p className="text-gray-500 text-sm text-center">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-blue-600 hover:underline font-semibold"
          >
            Sign Up
          </Link>
        </p>
      </form>
    </div>
  );
}

function OrbitaLogo() {
  return (
    <svg width="64" height="64" viewBox="0 0 85 85" fill="none" aria-hidden>
      <circle cx="42.5" cy="42.5" r="35" stroke="#6366f1" strokeWidth="1" opacity="0.15" />
      <circle cx="42.5" cy="42.5" r="27" stroke="#6366f1" strokeWidth="1.2" opacity="0.25" />
      <circle cx="42.5" cy="42.5" r="18" fill="#6366f1" opacity="0.2" />
      <circle cx="42.5" cy="42.5" r="11" fill="#6366f1" opacity="0.4" />
      <circle cx="42.5" cy="42.5" r="6" fill="#6366f1" />
      <circle cx="42.5" cy="18" r="4" fill="#3b82f6" />
      <circle cx="62" cy="30" r="2.5" fill="#60a5fa" />
      <circle cx="62" cy="56" r="3.5" fill="#8b5cf6" />
      <circle cx="42.5" cy="67" r="2.5" fill="#a78bfa" />
      <circle cx="23" cy="56" r="3" fill="#ec4899" />
      <circle cx="23" cy="30" r="2.5" fill="#f97316" />
    </svg>
  );
}
