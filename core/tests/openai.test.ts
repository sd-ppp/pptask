import { describe, it, expect } from 'vitest';
import { openaiProviderDefinition } from '../src/providers/openai/index.ts';
import type { DescribeParams, TaskCreateParams } from '../src/types.ts';

describe('openai provider', () => {
  describe('describeResource', () => {
    it('returns correct form schema for edits endpoint', async () => {
      const params: DescribeParams = {
        locator: 'openai://edits',
        platformConfig: { apiKey: 'test-key' },
      };

      const result = await openaiProviderDefinition.describeResource(params);

      expect(result.provider).toBe('openai');
      expect(result.metadata.scheme).toBe('openai');
      expect(result.metadata.endpoint).toBe('edits');
      expect(result.formSchema).toBeDefined();
      expect(result.formSchema.properties).toHaveProperty('image');
      expect(result.formSchema.properties).toHaveProperty('prompt');
      expect(result.formSchema.properties).toHaveProperty('mask');
      expect(result.formSchema.properties).toHaveProperty('model');
      expect(result.formValues).toEqual({
        prompt: '',
        model: 'dall-e-2',
        n: 1,
        size: '1024x1024',
      });
      expect(result.cancelable).toBe(false);
    });

    it('returns correct form schema for generations endpoint', async () => {
      const params: DescribeParams = {
        locator: 'openai://generations',
        platformConfig: { apiKey: 'test-key' },
      };

      const result = await openaiProviderDefinition.describeResource(params);

      expect(result.metadata.endpoint).toBe('generations');
      expect(result.formSchema.properties).toHaveProperty('prompt');
      expect(result.formSchema.properties).toHaveProperty('quality');
      expect(result.formSchema.properties).toHaveProperty('style');
      expect(result.formValues.model).toBe('dall-e-3');
    });

    it('returns correct form schema for variations endpoint', async () => {
      const params: DescribeParams = {
        locator: 'openai://variations',
        platformConfig: { apiKey: 'test-key' },
      };

      const result = await openaiProviderDefinition.describeResource(params);

      expect(result.metadata.endpoint).toBe('variations');
      expect(result.formSchema.properties).toHaveProperty('image');
      expect(result.formSchema.properties).not.toHaveProperty('prompt');
      expect(result.formValues.model).toBe('dall-e-2');
    });

    it('throws error for non-openai locator', async () => {
      const params: DescribeParams = {
        locator: 'replicate:///some/model',
        platformConfig: { apiKey: 'test-key' },
      };

      await expect(openaiProviderDefinition.describeResource(params)).rejects.toThrow(
        'openai provider received unsupported locator'
      );
    });

    it('throws error for unsupported endpoint', async () => {
      const params: DescribeParams = {
        locator: 'openai://unknown',
        platformConfig: { apiKey: 'test-key' },
      };

      await expect(openaiProviderDefinition.describeResource(params)).rejects.toThrow(
        'Unsupported OpenAI endpoint'
      );
    });
  });

  describe('createTaskSync', () => {
    it('validates that createTaskSync is defined', () => {
      expect(openaiProviderDefinition.createTaskSync).toBeDefined();
      expect(typeof openaiProviderDefinition.createTaskSync).toBe('function');
    });

    it('validates that async methods are not defined', () => {
      expect(openaiProviderDefinition.createTaskAsync).toBeUndefined();
      expect(openaiProviderDefinition.checkStatus).toBeUndefined();
      expect(openaiProviderDefinition.getResult).toBeUndefined();
      expect(openaiProviderDefinition.cancelTask).toBeUndefined();
    });

    it('throws error when apiKey is missing', async () => {
      const params: TaskCreateParams = {
        locator: 'openai://edits',
        payload: { image: 'base64data', prompt: 'test' },
        platformConfig: {},
      };

      await expect(openaiProviderDefinition.createTaskSync!(params)).rejects.toThrow(
        'openai provider requires apiKey'
      );
    });

    it('throws error when image is missing for edits', async () => {
      const params: TaskCreateParams = {
        locator: 'openai://edits',
        payload: { prompt: 'test' },
        platformConfig: { apiKey: 'test-key' },
      };

      await expect(openaiProviderDefinition.createTaskSync!(params)).rejects.toThrow(
        'Image is required'
      );
    });

    it('throws error when prompt is missing for edits', async () => {
      const params: TaskCreateParams = {
        locator: 'openai://edits',
        payload: { image: 'base64data' },
        platformConfig: { apiKey: 'test-key' },
      };

      await expect(openaiProviderDefinition.createTaskSync!(params)).rejects.toThrow(
        'Prompt is required'
      );
    });

    it('throws error when prompt is missing for generations', async () => {
      const params: TaskCreateParams = {
        locator: 'openai://generations',
        payload: {},
        platformConfig: { apiKey: 'test-key' },
      };

      await expect(openaiProviderDefinition.createTaskSync!(params)).rejects.toThrow(
        'Prompt is required'
      );
    });

    it('throws error when image is missing for variations', async () => {
      const params: TaskCreateParams = {
        locator: 'openai://variations',
        payload: {},
        platformConfig: { apiKey: 'test-key' },
      };

      await expect(openaiProviderDefinition.createTaskSync!(params)).rejects.toThrow(
        'Image is required'
      );
    });
  });

  describe('endpoint normalization', () => {
    it('normalizes edit endpoints', async () => {
      const variants = ['openai://edit', 'openai://edits', 'openai://image-edit'];
      
      for (const locator of variants) {
        const result = await openaiProviderDefinition.describeResource({
          locator,
          platformConfig: { apiKey: 'test-key' },
        });
        expect(result.metadata.endpoint).toBe('edits');
      }
    });

    it('normalizes generation endpoints', async () => {
      const variants = ['openai://generate', 'openai://generations', 'openai://image-generate'];
      
      for (const locator of variants) {
        const result = await openaiProviderDefinition.describeResource({
          locator,
          platformConfig: { apiKey: 'test-key' },
        });
        expect(result.metadata.endpoint).toBe('generations');
      }
    });

    it('normalizes variation endpoints', async () => {
      const variants = ['openai://variation', 'openai://variations', 'openai://image-variation'];
      
      for (const locator of variants) {
        const result = await openaiProviderDefinition.describeResource({
          locator,
          platformConfig: { apiKey: 'test-key' },
        });
        expect(result.metadata.endpoint).toBe('variations');
      }
    });
  });
});
