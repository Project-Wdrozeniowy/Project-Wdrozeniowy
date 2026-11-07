import { Outlet } from 'react-router';
export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center py-12 px-4">
      <Outlet />
    </div>
  );
}
