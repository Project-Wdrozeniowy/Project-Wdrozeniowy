import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack configuration at root level (not in experimental)
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;