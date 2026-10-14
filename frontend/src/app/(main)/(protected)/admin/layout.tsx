import RoleGuard from '@/app/_guards/RoleGuard';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRoles={['ADMIN']}>{children}</RoleGuard>;
}
