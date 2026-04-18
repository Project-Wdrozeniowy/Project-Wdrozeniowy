'use client';

import Link from 'next/link';
import { useState } from 'react';

const INTERESTS = [
  { key: 'ai', label: 'AI / Tech', color: 'bg-blue-500' },
  { key: 'gaming', label: 'Gaming', color: 'bg-green-500' },
  { key: 'politics', label: 'Politics', color: 'bg-red-500' },
  { key: 'science', label: 'Science', color: 'bg-violet-500' },
  { key: 'business', label: 'Business', color: 'bg-amber-500' },
  { key: 'education', label: 'Education', color: 'bg-teal-500' },
  { key: 'news', label: 'News', color: 'bg-gray-500' },
];

export default function RegisterPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleInterest(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  return (
    <div className="w-full max-w-2xl">
      {/* Logo + heading */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <OrbitaLogo />
        <h1 className="text-gray-900 font-bold text-4xl text-center mt-2">
          Join Our Community
        </h1>
        <p className="text-gray-500 text-base text-center">
          Create your account and start sharing your ideas
        </p>
      </div>

      {/* Card */}
      <div className="bg-white rounded-xl p-8 flex flex-col gap-5">
        {/* Username */}
        <FormField
          label="Username"
          hint="This will be your public display name"
        >
          <input
            type="text"
            placeholder="Choose a unique username"
            className="input"
          />
        </FormField>

        {/* Email */}
        <FormField label="Email">
          <input
            type="email"
            placeholder="your.email@example.com"
            className="input"
          />
        </FormField>

        {/* Password */}
        <FormField
          label="Password"
          hint="Minimum 8 characters with letters and numbers"
        >
          <input
            type="password"
            placeholder="Create a strong password"
            className="input"
          />
        </FormField>

        {/* Confirm password */}
        <FormField label="Confirm Password">
          <input
            type="password"
            placeholder="Re-enter your password"
            className="input"
          />
        </FormField>

        {/* Interests */}
        <div className="flex flex-col gap-3">
          <div>
            <p className="text-gray-900 font-semibold text-base">
              Select Your Interests
            </p>
            <p className="text-gray-500 text-xs mt-0.5">
              Choose topics you&apos;re interested in to personalize your feed
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {INTERESTS.map(({ key, label, color }) => {
              const active = selected.has(key);
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => toggleInterest(key)}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors ${
                    active
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-transparent bg-white hover:bg-gray-50'
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-full ${color} flex items-center justify-center shrink-0`}
                  >
                    <span className="text-white font-bold text-lg">
                      {label[0]}
                    </span>
                  </div>
                  <span className="text-gray-900 font-semibold text-sm">
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          <p className="text-gray-500 text-xs">
            Selected {selected.size} topic{selected.size !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Terms */}
        <label className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" />
          <span className="text-gray-900 font-semibold text-sm">
            I agree to the Terms of Service and Privacy Policy
          </span>
        </label>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded transition-colors"
        >
          Create Account
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

        {/* Sign in link */}
        <p className="text-gray-500 text-sm text-center">
          Already have an account?{' '}
          <Link
            href="/login"
            className="text-blue-600 hover:underline font-semibold"
          >
            Sign In
          </Link>
        </p>
      </div>

      <p className="text-gray-500 text-xs text-center mt-4">
        By signing up, you agree to our community guidelines and terms.
      </p>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-gray-900 font-semibold text-sm">{label}</label>
      {children}
      {hint && <p className="text-gray-500 text-xs">{hint}</p>}
    </div>
  );
}

function OrbitaLogo() {
  return (
    <svg width="85" height="85" viewBox="0 0 85 85" fill="none" aria-hidden>
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
