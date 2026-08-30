import { buildFormilySchemaFromJsonSchema, type JsonSchemaObject } from '../../common/json-schema-formily.ts';
import type { DescribeParams, DescribeResult } from '../../types.ts';
import { getKieDescribeEntry } from './describe/registry.ts';
import { canonicalizeKieLocator, parseKieLocator } from './locator.ts';

const KIE_SCHEME = 'kie';

export async function describeKieResource(params: DescribeParams): Promise<DescribeResult> {
  const { model } = parseKieLocator(params.locator);
  const entry = getKieDescribeEntry(canonicalizeKieLocator(params.locator));
  if (!entry) {
    throw new Error(`kie provider received unsupported locator: ${params.locator}`);
  }
  if (entry.modelId !== model) {
    throw new Error(`kie provider received unsupported locator: ${params.locator}`);
  }

  const inputSchema = buildKieInputSchema(entry.requestSchema, entry.wireMetadata);
  const { schema, values } = buildFormilySchemaFromJsonSchema(inputSchema);

  return {
    provider: KIE_SCHEME,
    metadata: {
      scheme: KIE_SCHEME,
      source: 'kie-describe-registry',
      locator: entry.locator,
      model: entry.modelId,
      outputType: entry.outputType,
      endpoint: entry.endpoint,
      wireMetadata: entry.wireMetadata,
    },
    formSchema: schema,
    formValues: values,
    recommendUploadProvider: KIE_SCHEME,
    cancelable: false,
  };
}

function buildKieInputSchema(
  requestSchema: Record<string, unknown>,
  wireMetadata: { callbackField?: string; modelField?: string },
): JsonSchemaObject {
  const schema = { ...(requestSchema as JsonSchemaObject) };
  const properties = { ...(schema.properties ?? {}) };
  const ignoredFields = new Set([
    wireMetadata.modelField,
    wireMetadata.callbackField,
    'callBackUrl',
    'callbackUrl',
  ].filter(Boolean) as string[]);

  for (const field of ignoredFields) {
    delete properties[field];
  }

  const required = Array.isArray(schema.required)
    ? schema.required.filter(name => !ignoredFields.has(name) && name in properties)
    : undefined;

  return {
    ...schema,
    properties,
    required,
  };
}
