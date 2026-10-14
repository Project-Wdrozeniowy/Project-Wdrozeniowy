import AuthGuard from '@/app/_guards/AuthGuard';

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
