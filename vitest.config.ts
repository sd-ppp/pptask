import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',

    include: [
      'core/tests/**/*.test.ts',
      'executors/inline/tests/**/*.test.ts',
    ],
    
    // Timeout for integration tests (5 minutes for grsai image generation)
    testTimeout: 300_000,
    
    // Global setup
    globals: true,

    // Real Provider integration tests require explicit opt-in and credentials.
    exclude: process.env.PPTASK_RUN_INTEGRATION === '1'
      ? []
      : ['**/*.integration.test.ts'],
    
    // Load test.env before running tests
    setupFiles: [resolve(import.meta.dirname, 'vitest.setup.ts')],
  },
});
