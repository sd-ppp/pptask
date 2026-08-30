import { describe, expect, it } from 'vitest';
import {
  buildFormilySchemaFromJsonSchema,
  mergeJsonSchemaObjects,
  resolveJsonSchemaProperty,
} from '../src/common/json-schema-formily.ts';

describe('buildFormilySchemaFromJsonSchema', () => {
  it('maps primitives, required, defaults, and string enums', () => {
    const { schema, values } = buildFormilySchemaFromJsonSchema({
      type: 'object',
      required: ['prompt', 'quality'],
      properties: {
        prompt: { type: 'string', minLength: 3, maxLength: 5000 },
        quality: { type: 'string', enum: ['basic', 'high'], default: 'basic' },
        enabled: { type: 'boolean', default: false },
        steps: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
      },
    });

    expect(schema.properties.prompt).toMatchObject({
      type: 'string',
      required: true,
      'x-component': 'Input.TextArea',
    });
    expect(schema.properties.quality).toMatchObject({
      type: 'string',
      required: true,
      'x-component': 'Select',
      enum: [
        { label: 'basic', value: 'basic' },
        { label: 'high', value: 'high' },
      ],
    });
    expect(schema.properties.enabled).toMatchObject({
      type: 'boolean',
      'x-component': 'Switch',
    });
    expect(schema.properties.steps).toMatchObject({
      type: 'number',
      'x-component': 'NumberPicker',
      minimum: 1,
      maximum: 50,
    });
    expect(values).toEqual({
      prompt: '',
      quality: 'basic',
      enabled: false,
      steps: 20,
    });
  });

  it('keeps numeric enum values as numbers', () => {
    const { schema, values } = buildFormilySchemaFromJsonSchema({
      type: 'object',
      properties: {
        duration: { type: 'integer', enum: [3, 5, 10], default: 5 },
      },
    });

    expect(schema.properties.duration.enum).toEqual([
      { label: 3, value: 3 },
      { label: 5, value: 5 },
      { label: 10, value: 10 },
    ]);
    expect(values.duration).toBe(5);
    expect(typeof values.duration).toBe('number');
  });

  it('omits optional numeric fields without defaults from formValues', () => {
    const { values } = buildFormilySchemaFromJsonSchema({
      type: 'object',
      properties: {
        guidance: { type: 'number', minimum: 1.5, maximum: 10 },
        width: { type: 'integer', minimum: 256, maximum: 2048 },
      },
    });

    expect(values).toEqual({});
  });

  it('maps uri and uri arrays to upload components', () => {
    const { schema } = buildFormilySchemaFromJsonSchema({
      type: 'object',
      properties: {
        image_url: { type: 'string', format: 'uri' },
        image_urls: {
          type: 'array',
          items: { type: 'string', format: 'uri' },
          maxItems: 10,
        },
      },
    });

    expect(schema.properties.image_url['x-component']).toBe('Upload');
    expect(schema.properties.image_urls['x-component']).toBe('Upload.Dragger');
    expect(schema.properties.image_urls['x-component-props']).toMatchObject({
      maxCount: 10,
    });
  });

  it('resolves oneOf and allOf enum variants', () => {
    const { schema } = buildFormilySchemaFromJsonSchema({
      type: 'object',
      properties: {
        mode: {
          oneOf: [
            { const: 'std', title: 'Standard' },
            { const: 'pro', title: 'Pro' },
          ],
        },
        codec: {
          allOf: [
            { enum: ['aac', 'mp3'] },
          ],
        },
      },
    });

    expect(schema.properties.mode['x-component']).toBe('Select');
    expect(schema.properties.mode.enum).toEqual([
      { label: 'Standard', value: 'std' },
      { label: 'Pro', value: 'pro' },
    ]);
    expect(schema.properties.codec.enum).toEqual([
      { label: 'aac', value: 'aac' },
      { label: 'mp3', value: 'mp3' },
    ]);
  });

  it('prefers non-null branches for nullable oneOf schemas', () => {
    const resolved = resolveJsonSchemaProperty({
      oneOf: [
        { type: 'null' },
        { type: 'string', enum: ['16:9', '9:16'], default: '16:9' },
      ],
    }, {});

    expect(resolved).toMatchObject({
      type: 'string',
      enum: ['16:9', '9:16'],
      default: '16:9',
    });
  });

  it('merges allOf constraints without losing limits', () => {
    const merged = mergeJsonSchemaObjects(
      { type: 'string', minLength: 3 },
      { enum: ['a', 'b'], maxLength: 20 },
    );

    expect(merged).toEqual({
      type: 'string',
      minLength: 3,
      maxLength: 20,
      enum: ['a', 'b'],
    });
  });

  it('builds ArrayItems schema for array-of-object fields', () => {
    const { schema } = buildFormilySchemaFromJsonSchema({
      type: 'object',
      properties: {
        multi_prompt: {
          type: 'array',
          items: {
            type: 'object',
            required: ['prompt', 'duration'],
            properties: {
              prompt: { type: 'string', maxLength: 500 },
              duration: { type: 'integer', minimum: 1, maximum: 12 },
            },
          },
        },
      },
    });

    expect(schema.properties.multi_prompt).toMatchObject({
      type: 'array',
      'x-component': 'ArrayItems',
    });
    expect(schema.properties.multi_prompt.items?.properties?.prompt).toMatchObject({
      'x-component': 'Input.TextArea',
      required: true,
    });
    expect(schema.properties.multi_prompt.items?.properties?.duration).toMatchObject({
      'x-component': 'NumberPicker',
      required: true,
      minimum: 1,
      maximum: 12,
    });
  });

  it('throws when $ref cannot be resolved', () => {
    expect(() => resolveJsonSchemaProperty({
      $ref: '#/components/schemas/Missing',
    }, {})).toThrow(/unable to resolve json schema \$ref/i);
  });
});
