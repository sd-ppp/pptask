import type { FormilyFieldSchema, FormilySchema } from '../types.ts';
import {
  buildEnum,
  mapComponent,
  mapComponentProps,
  mapJsonType,
  normalizeValue,
  resolveComponentName,
  type EnumOption,
} from './formily.ts';

export type JsonSchemaObject = {
  type?: string;
  properties?: Record<string, JsonSchemaObject>;
  required?: string[];
  enum?: unknown[];
  const?: unknown;
  title?: string;
  description?: string;
  default?: unknown;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  minItems?: number;
  maxItems?: number;
  format?: string;
  items?: JsonSchemaObject;
  oneOf?: JsonSchemaObject[];
  allOf?: JsonSchemaObject[];
  anyOf?: JsonSchemaObject[];
  $ref?: string;
  nullable?: boolean;
  [key: string]: unknown;
};

export type JsonSchemaFormilyOptions = {
  fieldDecorator?: string;
  fieldMetadata?: (fieldName: string, schema: JsonSchemaObject) => Record<string, unknown> | undefined;
  resolveRef?: (ref: string) => JsonSchemaObject | undefined;
};

export function buildFormilySchemaFromJsonSchema(
  rootSchema: JsonSchemaObject,
  options: JsonSchemaFormilyOptions = {},
): { schema: FormilySchema; values: Record<string, unknown> } {
  const properties: Record<string, FormilyFieldSchema> = {};
  const values: Record<string, unknown> = {};
  const requiredSet = new Set(Array.isArray(rootSchema.required) ? rootSchema.required : []);
  const entries = Object.entries(rootSchema.properties ?? {});

  entries.forEach(([name, rawProperty], index) => {
    const resolved = resolveJsonSchemaProperty(rawProperty, options);
    if (!resolved) return;

    const outputType = inferJsonSchemaOutputType(name, resolved);
    const fieldOptions = buildJsonSchemaOptions(name, resolved);
    const isRequired = requiredSet.has(name);
    fieldOptions.required = isRequired;
    const enumeration = buildEnum(fieldOptions);
    const componentType = outputType === 'array-object' ? 'array' : outputType;
    const recommendedComponent = outputType === 'string-multiline'
      ? 'Input.TextArea'
      : outputType === 'array-object'
        ? 'ArrayItems'
        : mapComponent(outputType, fieldOptions);
    const componentProps = mapComponentProps(componentType, fieldOptions);
    const componentName = resolveComponentName(componentType, recommendedComponent);

    const fieldSchema: FormilyFieldSchema = {
      type: mapJsonType(outputType === 'string-multiline' ? 'string' : componentType),
      title: typeof resolved.title === 'string' ? resolved.title : name,
      'x-index': index,
      'x-decorator': options.fieldDecorator ?? 'FormItem',
      'x-component': componentName,
      'x-json-schema': {
        outputType,
        options: fieldOptions,
        schema: resolved,
      },
    };

    if (outputType === 'array-object' && resolved.items) {
      const nested = buildFormilySchemaFromJsonSchema({
        type: 'object',
        required: Array.isArray(resolved.items.required) ? resolved.items.required : [],
        properties: resolved.items.properties ?? {},
      }, options);
      fieldSchema.items = nested.schema;
    }

    const metadata = options.fieldMetadata?.(name, resolved);
    if (metadata && Object.keys(metadata).length > 0) {
      Object.assign(fieldSchema, metadata);
    }

    if (Object.keys(componentProps).length > 0) {
      fieldSchema['x-component-props'] = componentProps;
    }
    if (resolved.description) fieldSchema.description = resolved.description;
    if (isRequired) fieldSchema.required = true;
    if (enumeration) fieldSchema.enum = enumeration;
    if (fieldSchema.type === 'number') {
      if (typeof resolved.minimum === 'number') fieldSchema.minimum = resolved.minimum;
      if (typeof resolved.maximum === 'number') fieldSchema.maximum = resolved.maximum;
    }
    if (typeof resolved.minLength === 'number') fieldSchema.minLength = resolved.minLength;
    if (typeof resolved.maxLength === 'number') fieldSchema.maxLength = resolved.maxLength;

    properties[name] = fieldSchema;

    const formValue = buildInitialFormValue(
      outputType,
      resolved,
      fieldOptions,
      enumeration,
      isRequired,
    );
    if (formValue !== undefined) {
      values[name] = formValue;
    }
  });

  return { schema: { type: 'object', properties }, values };
}

function buildInitialFormValue(
  outputType: string,
  resolved: JsonSchemaObject,
  fieldOptions: Record<string, unknown>,
  enumeration: EnumOption[] | undefined,
  isRequired: boolean,
): unknown {
  if (resolved.default !== undefined) {
    return normalizeValue(outputType, resolved.default, fieldOptions, enumeration);
  }
  if (!isRequired) {
    return undefined;
  }
  if (outputType === 'string' || outputType === 'string-multiline') {
    return normalizeValue(outputType, undefined, fieldOptions, enumeration);
  }
  if (outputType === 'combo') {
    return normalizeValue(outputType, undefined, fieldOptions, enumeration);
  }
  if (outputType === 'images' || outputType === 'array' || outputType === 'array-object') {
    return [];
  }
  if (outputType === 'boolean') {
    return false;
  }
  return undefined;
}

export function resolveJsonSchemaProperty(
  property: JsonSchemaObject | undefined,
  options: JsonSchemaFormilyOptions,
): JsonSchemaObject | undefined {
  if (!property) return undefined;
  if (property.$ref) {
    const resolved = options.resolveRef?.(property.$ref);
    if (!resolved) {
      throw new Error(`Unable to resolve JSON schema $ref: ${property.$ref}`);
    }
    return resolveJsonSchemaProperty(resolved, options);
  }
  if (Array.isArray(property.oneOf) && property.oneOf.length > 0) {
    return resolveCompositeSchema(property.oneOf, options, 'oneOf');
  }
  if (Array.isArray(property.anyOf) && property.anyOf.length > 0) {
    return resolveCompositeSchema(property.anyOf, options, 'anyOf');
  }
  if (Array.isArray(property.allOf) && property.allOf.length > 0) {
    return mergeAllOfSchemas(property, property.allOf, options);
  }
  return property;
}

function resolveCompositeSchema(
  variants: JsonSchemaObject[],
  options: JsonSchemaFormilyOptions,
  keyword: 'oneOf' | 'anyOf',
): JsonSchemaObject {
  const meaningful = variants
    .map(variant => resolveJsonSchemaProperty(variant, options))
    .filter((variant): variant is JsonSchemaObject => {
      if (!variant) return false;
      return !isNullSchema(variant);
    });

  if (meaningful.length === 1) {
    return meaningful[0];
  }

  const enumOptions = extractCompositeEnum(variants);
  if (enumOptions) {
    return {
      enum: enumOptions.map(item => item.value),
      'x-enum-labels': enumOptions.map(item => item.label),
      type: inferVariantPrimitiveType(variants) ?? 'string',
    };
  }

  if (meaningful.length === 0) {
    throw new Error(`Unable to resolve ${keyword} schema variant`);
  }

  const merged = meaningful.reduce(
    (acc, variant) => mergeJsonSchemaObjects(acc, variant),
    {},
  );
  if (!merged.type && meaningful.every(variant => variant.type === meaningful[0].type)) {
    merged.type = meaningful[0].type;
  }
  return merged;
}

function mergeAllOfSchemas(
  property: JsonSchemaObject,
  variants: JsonSchemaObject[],
  options: JsonSchemaFormilyOptions,
): JsonSchemaObject {
  const merged = variants.reduce<JsonSchemaObject>((acc, variant) => {
    const resolved = resolveJsonSchemaProperty(variant, options);
    if (!resolved) return acc;
    return mergeJsonSchemaObjects(acc, resolved);
  }, {});

  return {
    ...property,
    ...merged,
    properties: merged.properties,
    required: merged.required,
    allOf: undefined,
  };
}

export function mergeJsonSchemaObjects(
  base: JsonSchemaObject,
  overlay: JsonSchemaObject,
): JsonSchemaObject {
  const result: JsonSchemaObject = { ...base, ...overlay };

  if (base.properties || overlay.properties) {
    result.properties = {
      ...(base.properties ?? {}),
      ...(overlay.properties ?? {}),
    };
  }

  if (base.required || overlay.required) {
    result.required = [...new Set([
      ...(Array.isArray(base.required) ? base.required : []),
      ...(Array.isArray(overlay.required) ? overlay.required : []),
    ])];
  }

  if (overlay.enum) result.enum = overlay.enum;
  if (overlay.type && !result.type) result.type = overlay.type;
  if (overlay.format && !result.format) result.format = overlay.format;
  if (typeof overlay.minimum === 'number') result.minimum = overlay.minimum;
  if (typeof overlay.maximum === 'number') result.maximum = overlay.maximum;
  if (typeof overlay.minLength === 'number') result.minLength = overlay.minLength;
  if (typeof overlay.maxLength === 'number') result.maxLength = overlay.maxLength;
  if (overlay.items && !result.items) result.items = overlay.items;

  return result;
}

function isNullSchema(schema: JsonSchemaObject): boolean {
  return schema.type === 'null' || schema.const === null;
}

function inferVariantPrimitiveType(variants: JsonSchemaObject[]): string | undefined {
  const types = variants
    .map(variant => variant.type)
    .filter((type): type is string => typeof type === 'string' && type !== 'null');
  return types[0];
}

function extractCompositeEnum(
  variants: JsonSchemaObject[],
): Array<{ label: unknown; value: unknown }> | undefined {
  const options: Array<{ label: unknown; value: unknown }> = [];
  for (const variant of variants) {
    if (isNullSchema(variant)) continue;
    const value = variant.const ?? variant.enum?.[0];
    if (value === undefined) continue;
    options.push({
      label: variant.title ?? value,
      value,
    });
  }
  return options.length > 0 ? options : undefined;
}

function inferJsonSchemaOutputType(fieldName: string, property: JsonSchemaObject): string {
  const enumLabels = property['x-enum-labels'] as unknown[] | undefined;
  if (Array.isArray(property.enum) || enumLabels) return 'combo';
  if (property.type === 'number' || property.type === 'integer') return 'number';
  if (property.type === 'boolean') return 'boolean';
  if (property.type === 'array') {
    const items = property.items ?? {};
    if (items.type === 'object') return 'array-object';
    if (items.type === 'string' && items.format === 'uri') return 'images';
    return 'array';
  }
  if (property.type === 'string') {
    if (property.format === 'uri') return 'images';
    if (shouldUseTextArea(fieldName, property)) return 'string-multiline';
    return 'string';
  }
  return 'string';
}

function shouldUseTextArea(fieldName: string, property: JsonSchemaObject): boolean {
  const normalizedName = fieldName.toLowerCase();
  if (/prompt|text|description|lyrics|dialogue|caption/.test(normalizedName)) return true;
  if (typeof property.maxLength === 'number' && property.maxLength >= 500) return true;
  return false;
}

function buildJsonSchemaOptions(fieldName: string, property: JsonSchemaObject): Record<string, unknown> {
  const options: Record<string, unknown> = {};
  const enumLabels = property['x-enum-labels'] as unknown[] | undefined;

  if (Array.isArray(property.enum)) {
    options.values = property.enum;
    if (Array.isArray(enumLabels)) {
      options.labels = enumLabels;
    }
  }

  if (typeof property.minimum === 'number') options.min = property.minimum;
  if (typeof property.maximum === 'number') options.max = property.maximum;
  if (typeof property.maxItems === 'number') options.maxCount = property.maxItems;
  else if (property.type === 'array' && property.items?.format === 'uri') options.maxCount = 10;
  if (typeof property.minItems === 'number') options.minItems = property.minItems;
  if (typeof property.maxLength === 'number') options.maxLength = property.maxLength;
  if (typeof property.minLength === 'number') options.minLength = property.minLength;
  if (shouldUseTextArea(fieldName, property)) options.multiline = true;

  return options;
}
