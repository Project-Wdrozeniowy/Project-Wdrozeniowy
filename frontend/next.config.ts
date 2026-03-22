import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Turbopack configuration at root level (not in experimental)
  turbopack: {
    root: process.cwd(),
  },

  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
    '192.168.0.94', // Your current IP
  ],
  
};

export default nextConfig;