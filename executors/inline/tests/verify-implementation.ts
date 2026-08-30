/**
 * Quick verification script for async generator implementation
 * Tests with a mock client to verify event flow
 */

import { createTaskHandleStream } from '../src/task-runner-enhanced.ts';
import type { TaskClient } from '../src/task-runner-enhanced.ts';

// Mock client that simulates a successful task
const mockClient: TaskClient = {
  createTaskAsync: async (params) => {
    console.log('📝 Creating task...');
    await delay(100);
    return {
      taskId: 'mock-task-123',
      status: 'pending',
      provider: 'mock',
      metadata: { created_at: new Date().toISOString() },
      raw: {},
    };
  },
  
  checkStatus: (() => {
    let callCount = 0;
    return async (params) => {
      callCount++;
      await delay(200);
      
      if (callCount === 1) {
        console.log('   Status: starting');
        return {
          taskId: params.taskId,
          status: 'starting',
          progress: 0,
          provider: 'mock',
          raw: {},
        };
      } else if (callCount === 2) {
        console.log('   Status: processing (30%)');
        return {
          taskId: params.taskId,
          status: 'processing',
          progress: 0.3,
          provider: 'mock',
          raw: {},
        };
      } else if (callCount === 3) {
        console.log('   Status: processing (70%)');
        return {
          taskId: params.taskId,
          status: 'processing',
          progress: 0.7,
          provider: 'mock',
          raw: {},
        };
      } else {
        console.log('   Status: succeeded');
        return {
          taskId: params.taskId,
          status: 'succeeded',
          progress: 1.0,
          provider: 'mock',
          raw: {},
        };
      }
    };
  })(),
  
  getResult: async (params) => {
    console.log('📦 Fetching result...');
    await delay(100);
    return {
      taskId: params.taskId,
      status: 'succeeded',
      outputs: [
        { url: 'https://example.com/output1.png' },
        { url: 'https://example.com/output2.png' },
      ],
      provider: 'mock',
      raw: {},
    };
  },
  
  cancelTask: async () => {
    console.log('🛑 Cancelling task...');
  },
};

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runVerification() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║   Async Generator Implementation Verification          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');
  
  console.log('Testing event flow with mock client...\n');
  
  try {
    const stream = createTaskHandleStream(
      'mock://test-model',
      { prompt: 'test prompt' },
      undefined,
      undefined,
      100, // Fast polling for testing
      mockClient as any
    );
    
    const events: any[] = [];
    let eventCount = 0;
    
    for await (const event of stream) {
      eventCount++;
      events.push(event);
      
      switch (event.type) {
        case 'created':
          console.log(`✨ [${eventCount}] Event: CREATED`);
          console.log(`   Task ID: ${event.taskId}`);
          console.log(`   Metadata:`, JSON.stringify(event.metadata, null, 2));
          break;
          
        case 'progress':
          console.log(`⏳ [${eventCount}] Event: PROGRESS`);
          console.log(`   Status: ${event.status}`);
          if (event.progress !== undefined) {
            console.log(`   Progress: ${(event.progress * 100).toFixed(1)}%`);
          }
          break;
          
        case 'completed':
          console.log(`✅ [${eventCount}] Event: COMPLETED`);
          console.log(`   Outputs: ${event.outputs.length} items`);
          event.outputs.forEach((output: any, idx: number) => {
            console.log(`   - Output ${idx + 1}:`, output.url);
          });
          break;
          
        case 'failed':
          console.log(`❌ [${eventCount}] Event: FAILED`);
          console.log(`   Error: ${event.error}`);
          break;
          
        case 'cancelled':
          console.log(`🛑 [${eventCount}] Event: CANCELLED`);
          break;
      }
      console.log('');
    }
    
    // Verify event sequence
    console.log('═══════════════════════════════════════════════════════');
    console.log(' Verification Results');
    console.log('═══════════════════════════════════════════════════════\n');
    
    const checks = {
      hasCreated: events.some(e => e.type === 'created'),
      hasProgress: events.some(e => e.type === 'progress'),
      hasCompleted: events.some(e => e.type === 'completed'),
      correctSequence: events[0]?.type === 'created' && events[events.length - 1]?.type === 'completed',
      progressIncreasing: true,
    };
    
    // Check progress increasing
    const progressEvents = events.filter(e => e.type === 'progress' && e.progress !== undefined);
    if (progressEvents.length > 1) {
      for (let i = 1; i < progressEvents.length; i++) {
        if (progressEvents[i].progress < progressEvents[i-1].progress) {
          checks.progressIncreasing = false;
          break;
        }
      }
    }
    
    console.log(`✓ Created event emitted: ${checks.hasCreated ? 'YES' : 'NO'}`);
    console.log(`✓ Progress events emitted: ${checks.hasProgress ? 'YES' : 'NO'}`);
    console.log(`✓ Completed event emitted: ${checks.hasCompleted ? 'YES' : 'NO'}`);
    console.log(`✓ Correct event sequence: ${checks.correctSequence ? 'YES' : 'NO'}`);
    console.log(`✓ Progress increasing: ${checks.progressIncreasing ? 'YES' : 'NO'}`);
    console.log(`\nTotal events: ${events.length}`);
    
    const allPassed = Object.values(checks).every(v => v === true);
    
    console.log('\n═══════════════════════════════════════════════════════');
    if (allPassed) {
      console.log(' ✅ ALL CHECKS PASSED!');
    } else {
      console.log(' ❌ SOME CHECKS FAILED');
      process.exit(1);
    }
    console.log('═══════════════════════════════════════════════════════\n');
    
  } catch (error: any) {
    console.error('\n❌ Verification failed with error:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Run verification
runVerification().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
