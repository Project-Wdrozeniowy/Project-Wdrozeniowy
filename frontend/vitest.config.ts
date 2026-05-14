import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'node_modules/**',
        '.next/**',
        'next.config.*',
        'postcss.config.*',
        'tailwind.config.*',
        'vitest.config.*',
        'eslint.config.*',
        '**/*.d.ts',
        // Next.js app-router pages and layouts — covered by E2E / integration tests
        'src/app/**',
        // Pure TypeScript type definitions — no executable runtime code
        'src/types/**',
      ],
      thresholds: {
        lines: 65,
        functions: 65,
        branches: 65,
        statements: 65,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
