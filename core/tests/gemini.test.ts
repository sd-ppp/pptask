import { describe, it, expect, beforeEach, vi } from 'vitest';
import { geminiProviderDefinition } from '../src/providers/gemini/index.ts';
import type { DescribeParams, TaskCreateParams } from '../src/types.ts';

describe('gemini provider', () => {
  describe('describeResource', () => {
    it('returns correct form schema and default values', async () => {
      const params: DescribeParams = {
        locator: 'gemini:///gemini-3-pro-image-preview',
        platformConfig: { apiKey: 'test-key' },
      };

      const result = await geminiProviderDefinition.describeResource(params);

      expect(result.provider).toBe('gemini');
      expect(result.metadata.scheme).toBe('gemini');
      expect(result.metadata.model).toBe('gemini-3-pro-image-preview');
      expect(result.formSchema).toBeDefined();
      expect(result.formSchema.properties).toHaveProperty('prompt');
      expect(result.formSchema.properties).toHaveProperty('urls');
      expect(result.formSchema.properties).toHaveProperty('aspectRatio');
      expect(result.formSchema.properties).toHaveProperty('imageSize');
      expect(result.formValues).toEqual({
        prompt: '',
        aspectRatio: '16:9',
        imageSize: '2K',
      });
      expect(result.cancelable).toBe(false);
    });

    it('throws error for non-gemini locator', async () => {
      const params: DescribeParams = {
        locator: 'replicate:///some/model',
        platformConfig: { apiKey: 'test-key' },
      };

      await expect(geminiProviderDefinition.describeResource(params)).rejects.toThrow(
        'gemini provider received unsupported locator'
      );
    });
  });

  describe('createTaskSync', () => {
    it('validates that createTaskSync is defined', () => {
      expect(geminiProviderDefinition.createTaskSync).toBeDefined();
      expect(typeof geminiProviderDefinition.createTaskSync).toBe('function');
    });

    it('validates that async methods are not defined', () => {
      expect(geminiProviderDefinition.createTaskAsync).toBeUndefined();
      expect(geminiProviderDefinition.checkStatus).toBeUndefined();
      expect(geminiProviderDefinition.getResult).toBeUndefined();
      expect(geminiProviderDefinition.cancelTask).toBeUndefined();
    });

    it('throws error when apiKey is missing', async () => {
      const params: TaskCreateParams = {
        locator: 'gemini:///gemini-3-pro-image-preview',
        payload: { prompt: 'test prompt' },
        platformConfig: {},
      };

      await expect(geminiProviderDefinition.createTaskSync!(params)).rejects.toThrow(
        'gemini provider requires apiKey'
      );
    });

    it('throws error when prompt and urls are both missing', async () => {
      const params: TaskCreateParams = {
        locator: 'gemini:///gemini-3-pro-image-preview',
        payload: {},
        platformConfig: { apiKey: 'test-key', baseUrl: 'http://localhost' },
      };

      await expect(geminiProviderDefinition.createTaskSync!(params)).rejects.toThrow(
        'gemini provider requires at least a prompt or reference image'
      );
    });
  });
});
