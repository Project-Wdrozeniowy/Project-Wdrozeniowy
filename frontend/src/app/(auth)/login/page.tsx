'use client';

import Link from 'next/link';

export default function LoginPage() {
  return (
    <div className="w-full max-w-120">
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
      <div className="bg-white rounded-xl p-8 flex flex-col gap-5">
        {/* Email */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="login-email" className="text-gray-900 font-semibold text-sm">Email</label>
          <input
            id="login-email"
            type="email"
            placeholder="your.email@example.com"
            className="input"
          />
        </div>

        {/* Password */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="login-password" className="text-gray-900 font-semibold text-sm">
              Password
            </label>
            <span className="text-blue-600 text-xs font-semibold">
              Forgot password?
            </span>
          </div>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            className="input"
          />
        </div>

        {/* Submit */}
        <button
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded transition-colors"
        >
          Sign In
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
              className="flex items-center justify-center py-2.5 rounded bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200"
            >
              <span className="text-xs text-gray-700 font-medium">
                {provider}
              </span>
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
      </div>
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
