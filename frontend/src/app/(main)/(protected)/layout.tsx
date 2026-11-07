import { Outlet } from 'react-router';
import AuthGuard from '@/app/_guards/AuthGuard';

export default function ProtectedLayout() {
  return (
    <AuthGuard>
      <Outlet />
    </AuthGuard>
  );
}
