'use client';

import { useState } from 'react';
import { ROLE_LABELS } from '@/constants/profile';
import { isHttpUrl } from '@/lib/url';
import type { MyProfile } from '@/shared/types';

const joinedFormat = new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long' });

/** "October 2026", or `null` for a value that is not a date (formatting it would throw). */
function formatJoined(createdAt: string): string | null {
  const date = new Date(createdAt);
  return Number.isNaN(date.getTime()) ? null : joinedFormat.format(date);
}

interface ProfileCardProps {
  profile: MyProfile;
}

export default function ProfileCard({ profile }: ProfileCardProps) {
  // The link that failed, not a flag: a new link gets its own chance to load.
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const name = profile.displayName || profile.username;
  const initial = (Array.from(name)[0] ?? '').toUpperCase();
  // Stored values can predate the form's rules, so only http(s) links are shown as images.
  const showAvatar =
    profile.avatarUrl !== null &&
    isHttpUrl(profile.avatarUrl) &&
    profile.avatarUrl !== failedAvatarUrl;
  const joined = formatJoined(profile.createdAt);

  return (
    <section aria-label="Profile" className="bg-white rounded-xl p-6 flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 text-2xl font-bold shrink-0 overflow-hidden">
          {showAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element -- user-provided URL on any host
            <img
              src={profile.avatarUrl ?? undefined}
              alt={`Avatar of ${name}`}
              referrerPolicy="no-referrer"
              onError={() => setFailedAvatarUrl(profile.avatarUrl)}
              className="w-full h-full object-cover"
            />
          ) : (
            <span aria-hidden="true">{initial}</span>
          )}
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <h1 className="text-gray-900 font-bold text-2xl break-words">{name}</h1>
          <p className="text-gray-500 text-sm break-all">@{profile.username}</p>
          <div className="flex items-center gap-3 flex-wrap text-gray-500 text-sm mt-1">
            <span className="bg-gray-100 text-gray-700 text-xs font-semibold px-2 py-0.5 rounded">
              {ROLE_LABELS[profile.role]}
            </span>
            {joined && <span>Joined {joined}</span>}
            <span>{profile.postCount} Posts</span>
            <span>{profile.commentCount} Comments</span>
          </div>
        </div>
      </div>

      {profile.bio && (
        <p className="text-gray-700 text-sm whitespace-pre-wrap break-words">{profile.bio}</p>
      )}
    </section>
  );
}
