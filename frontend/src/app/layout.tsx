import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import QueryProvider from '@/providers/QueryProvider';
import ToastProvider from '@/providers/ToastProvider';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Orbita',
  description: 'A community platform for sharing ideas and discussions',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <QueryProvider>{children}</QueryProvider>
        <ToastProvider />
      </body>
    </html>
  );
}
