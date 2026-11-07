import { Outlet } from 'react-router';
import RoleGuard from '@/app/_guards/RoleGuard';

export default function AdminLayout() {
  return (
    <RoleGuard allowedRoles={['ADMIN']}>
      <Outlet />
    </RoleGuard>
  );
}
