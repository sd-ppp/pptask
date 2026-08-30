import { describe, expect, it } from 'vitest';
import { compactJsonSchema } from '../scripts/lib/schema-compact.mjs';

describe('compactJsonSchema', () => {
  it('removes x-apidog-* metadata but keeps description text', () => {
    const result = compactJsonSchema({
      type: 'object',
      'x-apidog-orders': ['prompt'],
      properties: {
        prompt: {
          type: 'string',
          description: 'A helpful prompt description',
          'x-apidog-enum': [{ value: 'a' }],
        },
      },
    });
    expect(result).toEqual({
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'A helpful prompt description',
        },
      },
    });
  });

  it('removes the unused "examples" field to keep generated schemas compact', () => {
    const result = compactJsonSchema({
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'A helpful prompt description',
          examples: ['a very long example prompt that nobody reads in the generated schema output'],
        },
      },
    });
    expect(result.properties.prompt).toEqual({
      type: 'string',
      description: 'A helpful prompt description',
    });
    expect(result.properties.prompt).not.toHaveProperty('examples');
  });
});
