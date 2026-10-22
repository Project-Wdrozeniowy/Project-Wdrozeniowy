'use client';

import { Controller, useWatch } from 'react-hook-form';
import type { Control } from 'react-hook-form';
import type { RegisterFormData } from '@/features/sign-up/register.schema';
import { CATEGORIES } from '@/shared/constants/categories.const';
import { cn } from '@/shared/lib/cn';

interface InterestsPickerProps {
  control: Control<RegisterFormData>;
}

/** The topics a new user can pick. */
export default function InterestsPicker({ control }: InterestsPickerProps) {
  const selectedInterests = useWatch({ control, name: 'interests' }) ?? [];

  return (
    <>
      {/* TODO(PWDRZ-154): provisional interests UI; no backend persistence contract yet. */}
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
                      field.onChange(active ? current.filter((k) => k !== key) : [...current, key]);
                    }}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border-2 text-left transition-colors',
                      active
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-transparent bg-white hover:bg-gray-50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center shrink-0',
                        color
                      )}
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
    </>
  );
}
