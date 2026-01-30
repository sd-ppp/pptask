import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createInlineExecutor } from '../../executors/inline/src/index.ts';

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiSuite = geminiApiKey ? describe : describe.skip;

// Get output directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const outputDir = join(__dirname, 'output', 'gemini');

geminiSuite('gemini integration tests', () => {
  const apiKey = process.env.GEMINI_API_KEY!;
  const baseURL = process.env.GEMINI_BASE_URL || 'https://api.laozhang.ai';

  it(
    'generates image from text prompt and reference image',
    async () => {
      // Prepare output directory
      mkdirSync(outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = join(outputDir, `test-${timestamp}.json`);
      
      const testLog: any = {
        testName: 'gemini image generation test',
        startTime: new Date().toISOString(),
        logs: [],
      };

      function log(message: string, data?: any) {
        const logEntry = { time: new Date().toISOString(), message, data };
        testLog.logs.push(logEntry);
        console.log(message, data !== undefined ? data : '');
      }

      const apiStartTime = Date.now();
      
      try {
        // Create a simple 1x1 test image (base64 encoded PNG)
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        
        log('Starting Gemini image generation test via pptask');
        testLog.apiKey = apiKey.substring(0, 10) + '...';
        testLog.baseURL = baseURL;
        testLog.locator = 'gemini:///gemini-3-pro-image-preview';
        testLog.prompt = 'Generate a beautiful sunset landscape';

        // Create InlineExecutor
        const executor = createInlineExecutor({
          platformConfig: {
            apiKey,
            baseURL,
          },
        });

        log('Describing resource...');
        const description = await executor.describe({
          locator: 'gemini:///gemini-3-pro-image-preview',
        });
        
        log('✓ Resource described', {
          provider: description.provider,
          formFields: Object.keys(description.formSchema.properties),
        });

        log('Calling Gemini API via pptask...');
        const handle = await executor.run({
          locator: 'gemini:///gemini-3-pro-image-preview',
          payload: {
            prompt: 'Generate a beautiful sunset landscape',
            urls: [testImageBase64],
            aspectRatio: '16:9',
            imageSize: '2K',
          },
        });

        log(`✓ Task created: ${handle.taskId}`);
        testLog.taskId = handle.taskId;
        testLog.cancelable = handle.cancelable;

        // Wait for result
        const outputs = await handle.promise;

        const apiTime = Date.now() - apiStartTime;
        log(`✓ Task completed in ${apiTime}ms`);
        testLog.apiTime = apiTime;

        // Extract image from outputs
        let imageFound = false;
        let imageUrl: string | undefined;

        if (outputs && outputs.length > 0) {
          log(`Processing ${outputs.length} output(s)`);
          
          for (const output of outputs) {
            if (output.url) {
              imageUrl = output.url;
              imageFound = true;
              
              const mimeType = output.mimeType || 'image/png';
              log(`✓ Image found: ${mimeType}`);
              
              // Save the generated image
              if (imageUrl && imageUrl.startsWith('data:')) {
                const matches = imageUrl.match(/^data:[^;]+;base64,(.+)$/);
                if (matches) {
                  const imageData = Buffer.from(matches[1], 'base64');
                  const imageExt = mimeType.split('/')[1] || 'png';
                  const imageFilePath = join(outputDir, `generated-${timestamp}.${imageExt}`);
                  writeFileSync(imageFilePath, imageData);
                  log(`✓ Image saved to: ${imageFilePath}`);
                  testLog.imageFilePath = imageFilePath;
                  testLog.imageSize = imageData.length;
                  testLog.imageMimeType = mimeType;
                }
              }
              break;
            }
          }
        }

        testLog.success = imageFound;
        testLog.imageUrl = imageUrl ? imageUrl.substring(0, 100) + '...' : undefined;
        testLog.outputsCount = outputs.length;

        // Assertions
        expect(handle.taskId).toMatch(/^sync-/);
        expect(handle.cancelable).toBe(false);
        expect(outputs).toBeDefined();
        expect(outputs.length).toBeGreaterThan(0);
        expect(imageFound).toBe(true);
        expect(imageUrl).toBeDefined();

        log('✓ Test completed successfully');
        testLog.endTime = new Date().toISOString();
        
      } catch (error: any) {
        const apiTime = Date.now() - apiStartTime;
        testLog.error = error.message;
        testLog.errorStack = error.stack;
        testLog.apiTime = apiTime;
        testLog.success = false;
        testLog.endTime = new Date().toISOString();
        
        log(`✗ Error: ${error.message}`);
        
        throw error;
      } finally {
        // Save test log
        writeFileSync(outputFile, JSON.stringify(testLog, null, 2));
        log(`✓ Test log saved to: ${outputFile}`);
      }
    },
    300_000 // 5 minutes timeout
  );

  it(
    'handles abort signal correctly',
    async () => {
      mkdirSync(outputDir, { recursive: true });
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const outputFile = join(outputDir, `test-abort-${timestamp}.json`);
      
      const testLog: any = {
        testName: 'gemini abort test',
        startTime: new Date().toISOString(),
        logs: [],
      };

      function log(message: string, data?: any) {
        const logEntry = { time: new Date().toISOString(), message, data };
        testLog.logs.push(logEntry);
        console.log(message, data !== undefined ? data : '');
      }

      const apiStartTime = Date.now();
      const abortController = new AbortController();
      const signal = abortController.signal;

      // Abort after 100ms (very short to ensure abort happens)
      const abortTimer = setTimeout(() => {
        log('⚠ Aborting request after 100ms');
        abortController.abort();
      }, 100);

      try {
        const testImageBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

          const executor = createInlineExecutor({
            platformConfig: {
              apiKey,
              baseURL,
            },
          });

        log('Calling Gemini API (will abort after 100ms)...');
        
        const handle = await executor.run({
          locator: 'gemini:///gemini-3-pro-image-preview',
          payload: {
            prompt: 'Generate a detailed landscape painting',
            urls: [testImageBase64],
            aspectRatio: '16:9',
            imageSize: '2K',
          },
          options: {
            signal,
          },
        });

        await handle.promise;

        clearTimeout(abortTimer);
        
        // If we reach here, request completed before abort
        const apiTime = Date.now() - apiStartTime;
        log(`✓ Request completed before abort (${apiTime}ms)`);
        testLog.completedBeforeAbort = true;
        testLog.apiTime = apiTime;
        testLog.success = true;
        
      } catch (error: any) {
        clearTimeout(abortTimer);
        const apiTime = Date.now() - apiStartTime;
        
        if (error.name === 'AbortError') {
          log(`✓ Request was successfully aborted after ${apiTime}ms`);
          testLog.aborted = true;
          testLog.abortedAfterMs = apiTime;
          testLog.success = true;
          
          // Abort is expected, so don't fail the test
          expect(error.name).toBe('AbortError');
        } else {
          log(`✗ Unexpected error: ${error.message}`);
          testLog.error = error.message;
          testLog.errorStack = error.stack;
          testLog.success = false;
          throw error;
        }
        testLog.apiTime = apiTime;
      } finally {
        testLog.endTime = new Date().toISOString();
        writeFileSync(outputFile, JSON.stringify(testLog, null, 2));
        log(`✓ Test log saved to: ${outputFile}`);
      }
    },
    300_000 // 5 minutes timeout
  );
});
