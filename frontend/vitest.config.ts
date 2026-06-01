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
        'eslint.config.*',
        'tailwind.config.*',
        'vitest.config.*',
        '**/*.d.ts',
        // Type-only and shared files — no executable code
        'src/shared/**',
        // Constants — no executable logic
        'src/constants/**',
        // UI components and pages — covered by E2E/integration tests
        'src/components/**',
        'src/app/**',
        // Hooks — depend on React context, no unit tests
        'src/hooks/**',
        // Utility libraries
        'src/lib/**',
        'src/utils/**',
        // Test infrastructure
        'src/test/**',
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
