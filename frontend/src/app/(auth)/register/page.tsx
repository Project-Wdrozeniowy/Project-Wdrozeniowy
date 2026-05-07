'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CategoryKey } from '@/shared/types';
import { CATEGORIES } from '@/constants/categories';
import OrbitaLogo from '@/components/ui/OrbitaLogo';
import FormField from '@/components/ui/FormField';

export default function RegisterPage() {
  const [selected, setSelected] = useState<Set<CategoryKey>>(new Set());

  function toggleInterest(key: CategoryKey) {
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
      <div className="flex flex-col items-center gap-2 mb-6">
        <OrbitaLogo size={85} />
        <h1 className="text-gray-900 font-bold text-4xl text-center mt-2">Join Our Community</h1>
        <p className="text-gray-500 text-base text-center">
          Create your account and start sharing your ideas
        </p>
      </div>

      <div className="bg-white rounded-xl p-8 flex flex-col gap-5">
        <FormField label="Username" hint="This will be your public display name" id="username">
          <input
            id="username"
            type="text"
            placeholder="Choose a unique username"
            className="input"
          />
        </FormField>

        <FormField label="Email" id="email">
          <input id="email" type="email" placeholder="your.email@example.com" className="input" />
        </FormField>

        <FormField
          label="Password"
          hint="Minimum 8 characters with letters and numbers"
          id="password"
        >
          <input
            id="password"
            type="password"
            placeholder="Create a strong password"
            className="input"
          />
        </FormField>

        <FormField label="Confirm Password" id="confirm-password">
          <input
            id="confirm-password"
            type="password"
            placeholder="Re-enter your password"
            className="input"
          />
        </FormField>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-gray-900 font-semibold text-base">Select Your Interests</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Choose topics you&apos;re interested in to personalize your feed
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(({ key, label, color }) => {
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
                    <span className="text-white font-bold text-lg">{label[0]}</span>
                  </div>
                  <span className="text-gray-900 font-semibold text-sm">{label}</span>
                </button>
              );
            })}
          </div>

          <p className="text-gray-500 text-xs">
            Selected {selected.size} topic{selected.size !== 1 ? 's' : ''}
          </p>
        </div>

        <label className="flex items-center gap-3 bg-gray-100 rounded-lg px-4 py-3 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-blue-600" />
          <span className="text-gray-900 font-semibold text-sm">
            I agree to the Terms of Service and Privacy Policy
          </span>
        </label>

        <button
          type="button"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm py-2.5 rounded transition-colors"
        >
          Create Account
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
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline font-semibold">
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
