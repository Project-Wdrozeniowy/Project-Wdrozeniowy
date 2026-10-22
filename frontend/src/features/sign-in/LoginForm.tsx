'use client';

import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '@/features/sign-in/login.schema';
import type { LoginFormData } from '@/features/sign-in/login.schema';
import { useSignIn } from '@/features/sign-in/useSignIn';
import { cn } from '@/shared/lib/cn';
import SocialAuthButtons from '@/shared/ui/SocialAuthButtons';

export default function LoginForm() {
  const { signIn, serverError } = useSignIn();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  return (
    <form onSubmit={handleSubmit(signIn)} className="bg-white rounded-xl p-8 flex flex-col gap-5">
      {serverError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded">
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="login-username" className="text-gray-900 font-semibold text-sm">
          Username
        </label>
        <input
          {...register('username')}
          id="login-username"
          type="text"
          placeholder="your_username"
          autoComplete="username"
          className={cn('input', errors.username && 'ring-2 ring-red-500')}
        />
        {errors.username && <p className="text-red-500 text-xs">{errors.username.message}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label htmlFor="login-password" className="text-gray-900 font-semibold text-sm">
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
          id="login-password"
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          className={cn('input', errors.password && 'ring-2 ring-red-500')}
        />
        {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm py-2.5 rounded transition-colors"
      >
        {isSubmitting ? 'Signing in…' : 'Sign In'}
      </button>

      <SocialAuthButtons />

      <p className="text-gray-500 text-sm text-center">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-blue-600 hover:underline font-semibold">
          Sign Up
        </Link>
      </p>
    </form>
  );
}
