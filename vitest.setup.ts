/**
 * Vitest Setup
 * Loads test.env with provider API keys only when running tests.
 */

import { config as loadEnv } from 'dotenv';
import { resolve } from 'path';
import { registerBuiltinProviders } from './core/src/builtins.ts';

// Unit tests use the compatibility singleton explicitly; production imports do not.
registerBuiltinProviders();

const testEnvPath = resolve(__dirname, 'test.env');
const result = loadEnv({ path: testEnvPath });

if (result.error) {
  console.warn('\n⚠️  Warning: test.env not found');
  console.warn('   Integration tests may be skipped without API keys');
  console.warn('   To enable: cp test.env.example test.env\n');
} else {
  console.log('\n✓ Test environment initialized (pptask)');
  console.log('  REPLICATE_API_KEY:', process.env.REPLICATE_API_KEY ? '✓' : '✗');
  console.log('  RUNNINGHUB_API_KEY:', process.env.RUNNINGHUB_API_KEY ? '✓' : '✗');
  console.log('  GRSAI_API_KEY:', process.env.GRSAI_API_KEY ? '✓' : '✗');
  console.log('');
}
