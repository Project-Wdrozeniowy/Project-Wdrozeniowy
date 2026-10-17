/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // A preceding workspace build emits copies of tests into dist/.
  roots: ['<rootDir>/src'],
  setupFiles: ['<rootDir>/src/test/setup.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    // Entry point — not unit-testable (starts the server)
    '!src/index.ts',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageThreshold: {
    global: {
      lines: 95,
      functions: 90,
      branches: 85,
      statements: 95,
    },
  },
};
