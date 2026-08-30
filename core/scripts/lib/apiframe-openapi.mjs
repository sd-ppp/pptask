import { buildSearchText, normalizeOpenApiSchema } from './catalog-utils.mjs';
import { assertSchemaHasNoRefs, compactJsonSchema } from './schema-compact.mjs';

const MODALITY_CONFIG = [
  {
    modality: 'image',
    requestSchemaName: 'GenerateImageRequest',
    endpointPath: '/v2/images/generate',
  },
  {
    modality: 'video',
    requestSchemaName: 'GenerateVideoRequest',
    endpointPath: '/v2/videos/generate',
  },
  {
    modality: 'music',
    requestSchemaName: 'GenerateMusicRequest',
    endpointPath: '/v2/music/generate',
  },
];

export function validateApiframeModalityConfig(openapi) {
  for (const config of MODALITY_CONFIG) {
    const operation = openapi?.paths?.[config.endpointPath]?.post;
    if (!operation) {
      throw new Error(`Apiframe OpenAPI missing POST endpoint ${config.endpointPath}`);
    }

    const requestRef = operation?.requestBody?.content?.['application/json']?.schema?.$ref;
    const expectedRef = `#/components/schemas/${config.requestSchemaName}`;
    if (requestRef !== expectedRef) {
      throw new Error(
        `Apiframe endpoint ${config.endpointPath} request schema mismatch: expected ${expectedRef}, received ${requestRef ?? 'none'}`,
      );
    }

    const requestSchema = openapi?.components?.schemas?.[config.requestSchemaName];
    if (!requestSchema) {
      throw new Error(`Apiframe OpenAPI missing schema ${config.requestSchemaName}`);
    }
    if (!Array.isArray(requestSchema.oneOf) || requestSchema.oneOf.length === 0) {
      throw new Error(`Apiframe schema ${config.requestSchemaName} is missing oneOf variants`);
    }
  }
}

export function extractApiframeModelVariants(openapi) {
  validateApiframeModalityConfig(openapi);
  const variants = [];
  for (const config of MODALITY_CONFIG) {
    const requestSchema = openapi?.components?.schemas?.[config.requestSchemaName];
    const oneOf = Array.isArray(requestSchema?.oneOf) ? requestSchema.oneOf : [];
    for (const variant of oneOf) {
      const modelEnum = variant?.properties?.model?.enum;
      if (!Array.isArray(modelEnum) || modelEnum.length !== 1) continue;
      const modelId = String(modelEnum[0]);
      const paramsField = Object.keys(variant.properties ?? {}).find(key => key.endsWith('Params'));
      variants.push({
        modelId,
        modality: config.modality,
        endpointPath: config.endpointPath,
        variantSchema: variant,
        paramsField,
      });
    }
  }
  return variants.sort((left, right) => {
    const leftLocator = `apiframe://${left.modality}/${left.modelId}`;
    const rightLocator = `apiframe://${right.modality}/${right.modelId}`;
    return leftLocator.localeCompare(rightLocator);
  });
}

export function buildApiframeCatalogEntry(variant, modelsSummary) {
  const summary = modelsSummary?.models?.find(model => model.id === variant.modelId);
  const label = summary?.name ?? variant.modelId;
  const description = summary?.description ?? '';
  return {
    providerId: 'apiframe',
    locator: `apiframe://${variant.modality}/${variant.modelId}`,
    label,
    category: variant.modality,
    outputType: variant.modality,
    description,
    modelId: variant.modelId,
    modality: variant.modality,
    searchText: buildSearchText([label, variant.modelId, variant.modality, description]),
  };
}

export function buildApiframeDescribeEntry(variant, whitelistEntry, openapi) {
  const paramsSchema = variant.paramsField
    ? variant.variantSchema.properties?.[variant.paramsField] ?? null
    : null;
  const requestSchema = compactJsonSchema(normalizeOpenApiSchema({
    type: 'object',
    required: ['model', ...(variant.variantSchema.required ?? []).filter(key => key !== 'model')],
    properties: {
      model: variant.variantSchema.properties?.model,
      ...(variant.paramsField && paramsSchema
        ? { [variant.paramsField]: paramsSchema }
        : {}),
      ...(variant.variantSchema.properties?.prompt
        ? { prompt: variant.variantSchema.properties.prompt }
        : {}),
      ...(variant.variantSchema.properties?.webhookUrl
        ? { webhookUrl: variant.variantSchema.properties.webhookUrl }
        : {}),
      ...(variant.variantSchema.properties?.webhookEvents
        ? { webhookEvents: variant.variantSchema.properties.webhookEvents }
        : {}),
    },
  }), {
    document: openapi,
    root: openapi,
  });
  assertSchemaHasNoRefs(requestSchema);
  return {
    locator: whitelistEntry.locator,
    modelId: variant.modelId,
    providerId: 'apiframe',
    modality: variant.modality,
    label: whitelistEntry.label,
    outputType: variant.modality,
    endpoint: {
      method: 'POST',
      path: variant.endpointPath,
    },
    requestSchema,
    wireMetadata: {
      modelField: 'model',
      paramsField: variant.paramsField ?? null,
      wirePath: variant.paramsField ?? null,
    },
  };
}

export function buildApiframeCatalogEntries(openapi, modelsSummary = null) {
  const variants = extractApiframeModelVariants(openapi);
  const byLocator = new Map();
  for (const variant of variants) {
    const entry = buildApiframeCatalogEntry(variant, modelsSummary);
    byLocator.set(entry.locator, entry);
  }
  return [...byLocator.values()].sort((left, right) => left.locator.localeCompare(right.locator));
}

export function buildApiframeDescribeEntries(openapi, whitelistEntries, modelsSummary = null) {
  const variantsByLocator = new Map(
    extractApiframeModelVariants(openapi).map(variant => [
      `apiframe://${variant.modality}/${variant.modelId}`,
      variant,
    ]),
  );
  return whitelistEntries
    .map(whitelistEntry => {
      const variant = variantsByLocator.get(whitelistEntry.locator);
      if (!variant) return null;
      return buildApiframeDescribeEntry(variant, whitelistEntry, openapi);
    })
    .filter(Boolean)
    .sort((left, right) => left.locator.localeCompare(right.locator));
}
