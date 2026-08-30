import { buildFormilySchemaFromJsonSchema, type JsonSchemaObject } from '../../common/json-schema-formily.ts';
import type { DescribeParams, DescribeResult } from '../../types.ts';
import { getApiframeDescribeEntry } from './describe/registry.ts';
import { canonicalizeApiframeLocator, parseApiframeLocator } from './locator.ts';

const APIFRAME_SCHEME = 'apiframe';

export async function describeApiframeResource(params: DescribeParams): Promise<DescribeResult> {
  const canonicalLocator = canonicalizeApiframeLocator(params.locator);
  const { model } = parseApiframeLocator(params.locator);
  const entry = getApiframeDescribeEntry(canonicalLocator);
  if (!entry) {
    throw new Error(`apiframe provider received unsupported locator: ${params.locator}`);
  }
  if (entry.modelId !== model) {
    throw new Error(`apiframe provider received unsupported locator: ${params.locator}`);
  }

  const flattenedSchema = buildApiframeFlattenedSchema(entry.requestSchema, entry.wireMetadata);
  const wirePath = entry.wireMetadata.wirePath ?? undefined;
  const { schema, values } = buildFormilySchemaFromJsonSchema(flattenedSchema, {
    fieldMetadata: (fieldName, propertySchema) => {
      if (!wirePath || fieldName === 'prompt') return undefined;
      if (propertySchema['x-apiframe-wire-path']) {
        return {
          'x-apiframe': {
            wirePath: propertySchema['x-apiframe-wire-path'],
          },
        };
      }
      return {
        'x-apiframe': { wirePath },
      };
    },
  });

  return {
    provider: APIFRAME_SCHEME,
    metadata: {
      scheme: APIFRAME_SCHEME,
      source: 'apiframe-describe-registry',
      locator: entry.locator,
      model: entry.modelId,
      modality: entry.modality,
      outputType: entry.outputType,
      endpoint: entry.endpoint,
      wireMetadata: entry.wireMetadata,
    },
    formSchema: schema,
    formValues: values,
    recommendUploadProvider: APIFRAME_SCHEME,
    cancelable: false,
  };
}

function buildApiframeFlattenedSchema(
  requestSchema: Record<string, unknown>,
  wireMetadata: { modelField?: string; paramsField?: string | null },
): JsonSchemaObject {
  const schema = requestSchema as JsonSchemaObject;
  const properties: Record<string, JsonSchemaObject> = {};
  const required: string[] = [];
  const paramsField = wireMetadata.paramsField ?? undefined;
  const ignoredTopLevel = new Set([
    wireMetadata.modelField,
    'webhookUrl',
    'webhookEvents',
    paramsField,
  ].filter(Boolean) as string[]);

  for (const [name, property] of Object.entries(schema.properties ?? {})) {
    if (ignoredTopLevel.has(name)) continue;
    properties[name] = property;
    if (schema.required?.includes(name)) {
      required.push(name);
    }
  }

  if (paramsField) {
    const paramsSchema = schema.properties?.[paramsField] as JsonSchemaObject | undefined;
    const paramsRequired = Array.isArray(paramsSchema?.required) ? paramsSchema.required : [];
    for (const [name, property] of Object.entries(paramsSchema?.properties ?? {})) {
      properties[name] = {
        ...property,
        'x-apiframe-wire-path': paramsField,
      };
      if (paramsRequired.includes(name)) {
        required.push(name);
      }
    }
  }

  return {
    type: 'object',
    required,
    properties,
  };
}
