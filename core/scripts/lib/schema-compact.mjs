const APIDOG_META_KEYS = new Set([
  'x-apidog-orders',
  'x-apidog-refs',
  'x-apidog-ignore-properties',
  'x-apidog-enum',
]);

// Not apidog-specific, but similarly unused by any downstream consumer
// (form rendering reads `description`, not `examples`). Some upstream docs
// embed very large example payloads here, so dropping it keeps generated
// describe artifacts compact without losing anything actually read at
// runtime.
const UNUSED_META_KEYS = new Set(['examples']);

function isRemovableMetaKey(key) {
  return APIDOG_META_KEYS.has(key) || UNUSED_META_KEYS.has(key);
}

export function compactJsonSchema(schema, context = {}) {
  if (!schema || typeof schema !== 'object') return schema;
  const ignoredProperties = new Set(
    Array.isArray(schema['x-apidog-ignore-properties'])
      ? schema['x-apidog-ignore-properties']
      : [],
  );
  const compacted = compactJsonSchemaNode(schema, context, ignoredProperties);
  return removeApidogMetadata(compacted);
}

function compactJsonSchemaNode(schema, context, ignoredProperties = new Set()) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) {
    return schema.map(item => compactJsonSchemaNode(item, context, ignoredProperties));
  }
  if (schema.$ref) {
    const resolved = resolveJsonSchemaRef(schema.$ref, context);
    return compactJsonSchemaNode(resolved, context, ignoredProperties);
  }

  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    if (isRemovableMetaKey(key)) continue;
    if (key === 'properties' && value && typeof value === 'object') {
      const properties = {};
      for (const [propertyName, propertySchema] of Object.entries(value)) {
        if (ignoredProperties.has(propertyName)) continue;
        properties[propertyName] = compactJsonSchemaNode(propertySchema, context, ignoredProperties);
      }
      result.properties = properties;
      continue;
    }
    if (value && typeof value === 'object') {
      result[key] = compactJsonSchemaNode(value, context, ignoredProperties);
      continue;
    }
    result[key] = value;
  }
  return result;
}

function removeApidogMetadata(schema) {
  if (!schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) {
    return schema.map(item => removeApidogMetadata(item));
  }
  const result = {};
  for (const [key, value] of Object.entries(schema)) {
    if (isRemovableMetaKey(key)) continue;
    if (value && typeof value === 'object') {
      result[key] = removeApidogMetadata(value);
      continue;
    }
    result[key] = value;
  }
  return result;
}

export function resolveJsonSchemaRef(ref, context = {}) {
  if (!ref || typeof ref !== 'string') {
    throw new Error('JSON schema $ref must be a string');
  }
  if (!ref.startsWith('#/')) {
    throw new Error(`Unsupported JSON schema $ref: ${ref}`);
  }
  const path = ref.slice(2).split('/').map(segment => decodeURIComponent(segment));
  let current = context.root ?? context.components ?? context.document ?? null;
  if (path[0] === 'components' && context.document?.components) {
    current = context.document;
  }
  if (!current) {
    throw new Error(`Unable to resolve JSON schema $ref without context: ${ref}`);
  }
  for (const segment of path) {
    if (!current || typeof current !== 'object' || !(segment in current)) {
      throw new Error(`Unable to resolve JSON schema $ref: ${ref}`);
    }
    current = current[segment];
  }
  if (!current || typeof current !== 'object') {
    throw new Error(`Unable to resolve JSON schema $ref: ${ref}`);
  }
  return current;
}

export function assertSchemaHasNoRefs(schema, path = '$') {
  if (!schema || typeof schema !== 'object') return;
  if (Array.isArray(schema)) {
    schema.forEach((item, index) => assertSchemaHasNoRefs(item, `${path}[${index}]`));
    return;
  }
  if (schema.$ref) {
    throw new Error(`Unresolved JSON schema $ref at ${path}: ${schema.$ref}`);
  }
  for (const [key, value] of Object.entries(schema)) {
    if (value && typeof value === 'object') {
      assertSchemaHasNoRefs(value, `${path}.${key}`);
    }
  }
}
