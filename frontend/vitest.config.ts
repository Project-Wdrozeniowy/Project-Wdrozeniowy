import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:3000',
      },
    },
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
        '**/*.d.ts',
        // Type-only files — no executable code
        '**/types/**',
        '**/shared/**',
        // Constants — no executable logic
        '**/constants/**',
        // Utility helpers and pure library code
        '**/utils/**',
        '**/lib/**',
        // UI components, pages, providers — covered by E2E/integration tests
        '**/components/**',
        '**/app/**',
        '**/hooks/**',
        '**/providers/**',
        // Test infrastructure
        '**/test/**',
        '**/mocks/**',
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
