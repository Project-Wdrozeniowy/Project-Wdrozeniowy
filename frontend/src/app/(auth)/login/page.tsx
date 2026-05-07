'use client';

import Link from 'next/link';
import OrbitaLogo from '@/components/ui/OrbitaLogo';

export default function LoginPage() {
  return (
    <div className="w-full max-w-120">
      <div className="flex flex-col items-center gap-2 mb-6">
        <OrbitaLogo size={64} />
        <h1 className="text-gray-900 font-bold text-4xl text-center mt-2">Welcome Back</h1>
        <p className="text-gray-500 text-base text-center">
          Sign in to your account to continue
        </p>
      </div>

      <div className="bg-white rounded-xl p-8 flex flex-col gap-5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-gray-900 font-semibold text-sm">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            placeholder="your.email@example.com"
            className="input"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-gray-900 font-semibold text-sm">
              Password
            </label>
            <span className="text-blue-600 text-xs font-semibold">Forgot password?</span>
          </div>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            className="input"
          />
        </div>

        <button
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded transition-colors"
        >
          Sign In
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
              className="flex items-center justify-center py-2.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <span className="text-xs text-gray-700 font-medium">{provider}</span>
            </button>
          ))}
        </div>

        <p className="text-gray-500 text-sm text-center">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-blue-600 hover:underline font-semibold">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
