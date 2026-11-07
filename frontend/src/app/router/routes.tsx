import { Outlet } from 'react-router';
import type { RouteObject } from 'react-router';
import RootLayout from '@/app/layouts/RootLayout';
import AuthLayout from '@/app/layouts/AuthLayout';
import MainLayout from '@/app/layouts/MainLayout';
import AuthGuard from './guards/AuthGuard';
import RoleGuard from './guards/RoleGuard';
import SessionLoader from './guards/SessionLoader';
import RouteErrorBoundary from './RouteErrorBoundary';

export const routes: RouteObject[] = [
  {
    path: '/',
    Component: RootLayout,
    HydrateFallback: SessionLoader,
    ErrorBoundary: RouteErrorBoundary,
    children: [
      {
        Component: AuthLayout,
        children: [
          {
            path: 'login',
            lazy: async () => ({ Component: (await import('@/pages/login')).LoginPage }),
          },
          {
            path: 'register',
            lazy: async () => ({ Component: (await import('@/pages/register')).RegisterPage }),
          },
        ],
      },
      {
        Component: MainLayout,
        children: [
          {
            index: true,
            lazy: async () => ({ Component: (await import('@/pages/home')).HomePage }),
          },
          {
            path: 'forum',
            lazy: async () => ({ Component: (await import('@/pages/forum')).ForumPage }),
          },
          {
            path: 'forum/:slug',
            lazy: async () => ({ Component: (await import('@/pages/post')).PostPage }),
          },
          {
            path: 'search',
            lazy: async () => ({ Component: (await import('@/pages/search')).SearchPage }),
          },
          {
            element: (
              <AuthGuard>
                <Outlet />
              </AuthGuard>
            ),
            children: [
              {
                path: 'dashboard',
                lazy: async () => ({
                  Component: (await import('@/pages/dashboard')).DashboardPage,
                }),
              },
              {
                path: 'profile',
                lazy: async () => ({ Component: (await import('@/pages/profile')).ProfilePage }),
              },
              {
                path: 'settings',
                lazy: async () => ({ Component: (await import('@/pages/settings')).SettingsPage }),
              },
              {
                element: (
                  <RoleGuard allowedRoles={['ADMIN']}>
                    <Outlet />
                  </RoleGuard>
                ),
                children: [
                  {
                    path: 'admin',
                    lazy: async () => ({ Component: (await import('@/pages/admin')).AdminPage }),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
