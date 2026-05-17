/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    // Entry point — not unit-testable (starts the server)
    '!src/index.ts',
    // Auth redirect guard — integration-level behaviour, no unit tests yet
    '!src/middleware/authGuard.ts',
    // Proxy routes — integration-level behaviour, tested via app.test.ts
    '!src/routes/proxy.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      lines: 65,
      functions: 65,
      branches: 65,
      statements: 65,
    },
  },
};
