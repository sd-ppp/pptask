// Test script to verify the built package works
import { 
  describeResource, 
  createTask, 
  checkStatus, 
  getResult,
  listProviders
} from '../dist/index.js';

import { createInlineExecutor } from '../dist/executors/inline.js';

console.log('✓ Successfully imported from dist/index.js');
console.log('✓ Available functions:', {
  describeResource: typeof describeResource,
  createTask: typeof createTask,
  checkStatus: typeof checkStatus,
  getResult: typeof getResult,
  listProviders: typeof listProviders,
});

console.log('✓ Successfully imported from dist/executors/inline.js');
console.log('✓ createInlineExecutor:', typeof createInlineExecutor);

// Test listProviders
const providers = listProviders();
console.log('✓ Registered providers:', providers);

console.log('\n✅ All imports working correctly!');
