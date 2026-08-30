import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    // Test environment configuration
    environment: 'node',
    
    // Timeout for integration tests (5 minutes for grsai image generation)
    testTimeout: 300_000,
    
    // Global setup
    globals: true,
    
    // Load test.env before running tests
    setupFiles: [resolve(import.meta.dirname, 'vitest.setup.ts')],
  },
});
