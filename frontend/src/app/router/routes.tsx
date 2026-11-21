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
            // Public: the figures come from the public analytics endpoints; only the user's own
            // totals need a session, and the page shows them only when there is one.
            path: 'dashboard',
            lazy: async () => ({
              Component: (await import('@/pages/dashboard')).DashboardPage,
            }),
          },
          {
            element: (
              <AuthGuard>
                <Outlet />
              </AuthGuard>
            ),
            children: [
              {
                path: 'profile',
                lazy: async () => ({ Component: (await import('@/pages/profile')).ProfilePage }),
              },
              {
                path: 'notifications',
                lazy: async () => ({
                  Component: (await import('@/pages/notifications')).NotificationsPage,
                }),
              },
              {
                // `/settings` has no section: the page sends it to the default one.
                path: 'settings/:section?',
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
