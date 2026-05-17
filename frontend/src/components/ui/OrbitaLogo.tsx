export default function OrbitaLogo({ size = 85 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 85 85" fill="none" aria-hidden>
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
