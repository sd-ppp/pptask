/**
 * Manual test script for task stream
 * 
 * Usage:
 *   # Set up environment variables
 *   export REPLICATE_API_KEY="your-key"
 *   
 *   # Run the test
 *   npx tsx packages/pptask/executors/inline/tests/manual-stream-test.ts
 */

import { createTaskHandleStream } from '../src/task-runner-enhanced.ts';
import 'dotenv/config';

async function testTaskStream() {
  console.log('🚀 Testing async generator task stream...\n');

  const locator = 'replicate://black-forest-labs/flux-schnell';
  const payload = {
    prompt: 'A beautiful sunset over mountains',
    num_outputs: 1,
    aspect_ratio: '16:9',
  };

  const platformConfig = process.env.REPLICATE_API_KEY
    ? { apiKey: process.env.REPLICATE_API_KEY }
    : undefined;

  if (!platformConfig) {
    console.error('❌ Error: REPLICATE_API_KEY not found in environment');
    console.log('   Please set it first: export REPLICATE_API_KEY="your-key"');
    process.exit(1);
  }

  console.log('📋 Configuration:');
  console.log(`   Locator: ${locator}`);
  console.log(`   Prompt: ${payload.prompt}`);
  console.log(`   API Key: ${platformConfig.apiKey.substring(0, 10)}...`);
  console.log('');

  try {
    const stream = createTaskHandleStream(
      locator,
      payload,
      platformConfig,
      undefined,
      2000 // Poll every 2 seconds
    );

    console.log('📡 Starting task stream...\n');
    let eventCount = 0;

    for await (const event of stream) {
      eventCount++;
      
      switch (event.type) {
        case 'created':
          console.log(`✨ [Event ${eventCount}] Task Created`);
          console.log(`   Task ID: ${event.taskId}`);
          if (event.metadata) {
            console.log(`   Metadata:`, JSON.stringify(event.metadata, null, 2));
          }
          break;

        case 'progress':
          console.log(`⏳ [Event ${eventCount}] Progress Update`);
          console.log(`   Status: ${event.status}`);
          if (event.progress !== undefined) {
            console.log(`   Progress: ${(event.progress * 100).toFixed(1)}%`);
          }
          if (event.metadata) {
            console.log(`   Metadata:`, JSON.stringify(event.metadata, null, 2));
          }
          break;

        case 'completed':
          console.log(`✅ [Event ${eventCount}] Task Completed!`);
          console.log(`   Task ID: ${event.taskId}`);
          console.log(`   Outputs: ${event.outputs.length} item(s)`);
          event.outputs.forEach((output, idx) => {
            console.log(`   Output ${idx + 1}:`, JSON.stringify(output, null, 2));
          });
          break;

        case 'failed':
          console.log(`❌ [Event ${eventCount}] Task Failed`);
          console.log(`   Task ID: ${event.taskId}`);
          console.log(`   Error: ${event.error}`);
          break;

        case 'cancelled':
          console.log(`🛑 [Event ${eventCount}] Task Cancelled`);
          console.log(`   Task ID: ${event.taskId}`);
          break;
      }
      
      console.log('');
    }

    console.log(`\n🎉 Task stream completed! Total events: ${eventCount}\n`);
  } catch (error: any) {
    console.error('\n❌ Error during task execution:');
    console.error(`   ${error.message}`);
    if (error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Test with cancellation
async function testCancellation() {
  console.log('\n🧪 Testing cancellation...\n');

  const locator = 'replicate://black-forest-labs/flux-schnell';
  const payload = {
    prompt: 'A test image for cancellation',
  };

  const platformConfig = process.env.REPLICATE_API_KEY
    ? { apiKey: process.env.REPLICATE_API_KEY }
    : undefined;

  const abortController = new AbortController();

  // Cancel after 5 seconds
  setTimeout(() => {
    console.log('⏰ Timeout reached, cancelling task...\n');
    abortController.abort();
  }, 5000);

  try {
    const stream = createTaskHandleStream(
      locator,
      payload,
      platformConfig,
      { signal: abortController.signal },
      2000
    );

    for await (const event of stream) {
      console.log(`📡 Event: ${event.type}`);
    }

    console.log('❌ Should not reach here - task should be cancelled');
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.log('✅ Cancellation successful!');
      console.log(`   Error: ${error.message}\n`);
    } else {
      console.error('❌ Unexpected error:', error.message);
      throw error;
    }
  }
}

// Run tests
async function main() {
  const args = process.argv.slice(2);
  const testType = args[0] || 'basic';

  console.log('═══════════════════════════════════════════════════════');
  console.log('  Task Stream Integration Test');
  console.log('═══════════════════════════════════════════════════════\n');

  switch (testType) {
    case 'basic':
      await testTaskStream();
      break;
    case 'cancel':
      await testCancellation();
      break;
    case 'both':
      await testTaskStream();
      await testCancellation();
      break;
    default:
      console.error(`Unknown test type: ${testType}`);
      console.log('Usage: npm run test:stream [basic|cancel|both]');
      process.exit(1);
  }

  console.log('═══════════════════════════════════════════════════════');
  console.log('  All tests completed!');
  console.log('═══════════════════════════════════════════════════════\n');
}

main().catch((error) => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});
