import type { RouteObject } from 'react-router';
import SessionLoader from '@/app/_guards/SessionLoader';
import RootLayout, { RouteError } from '@/app/layout';
import AuthLayout from '@/app/(auth)/layout';
import MainLayout from '@/app/(main)/layout';
import ProtectedLayout from '@/app/(main)/(protected)/layout';
import AdminLayout from '@/app/(main)/(protected)/admin/layout';

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    hydrateFallbackElement: <SessionLoader />,
    errorElement: <RouteError />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          {
            path: '/login',
            lazy: async () => ({ Component: (await import('@/app/(auth)/login/page')).default }),
          },
          {
            path: '/register',
            lazy: async () => ({ Component: (await import('@/app/(auth)/register/page')).default }),
          },
        ],
      },
      {
        element: <MainLayout />,
        children: [
          {
            path: '/',
            lazy: async () => ({ Component: (await import('@/app/(main)/page')).default }),
          },
          {
            path: '/forum',
            lazy: async () => ({ Component: (await import('@/app/(main)/forum/page')).default }),
          },
          {
            path: '/forum/:slug',
            lazy: async () => ({
              Component: (await import('@/app/(main)/forum/[slug]/page')).default,
            }),
          },
          {
            path: '/search',
            lazy: async () => ({ Component: (await import('@/app/(main)/search/page')).default }),
          },
          {
            element: <ProtectedLayout />,
            children: [
              {
                path: '/dashboard',
                lazy: async () => ({
                  Component: (await import('@/app/(main)/(protected)/dashboard/page')).default,
                }),
              },
              {
                path: '/profile',
                lazy: async () => ({
                  Component: (await import('@/app/(main)/(protected)/profile/page')).default,
                }),
              },
              {
                path: '/settings',
                lazy: async () => ({
                  Component: (await import('@/app/(main)/(protected)/settings/page')).default,
                }),
              },
              {
                element: <AdminLayout />,
                children: [
                  {
                    path: '/admin',
                    lazy: async () => ({
                      Component: (await import('@/app/(main)/(protected)/admin/page')).default,
                    }),
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
