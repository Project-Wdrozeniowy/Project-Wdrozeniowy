import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack configuration at root level (not in experimental)
  turbopack: {
    root: process.cwd(),
  },

  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    ...(process.env.NEXT_PUBLIC_DEV_ORIGIN ? [process.env.NEXT_PUBLIC_DEV_ORIGIN] : []),
  ],
  
};

export default nextConfig;